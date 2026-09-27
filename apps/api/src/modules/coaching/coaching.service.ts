import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { listAchievements } from "../media/achievement-view";
import { PrismaService } from "../prisma/prisma.service";
import { ReputationService } from "../reputation/reputation.service";
import { findActiveProfile, parseGame } from "../../common/game";
import { CreateCoachProfileDto } from "./dto/create-coach-profile.dto";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import type { ReviewCoachDto } from "./dto/review-coach.dto";
import type { CoachReviewStatus } from "@fpt-esporthub/database";
import { coachInclude, toCoachSummary } from "./coaching.mappers";

const REVIEW_LIMIT = 20;
const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  player: { select: { id: true, displayName: true } },
};

/** Trim, drop empties and case-insensitive duplicates. */
function cleanList(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

@Injectable()
export class CoachingService {
  constructor(
    private prisma: PrismaService,
    private reputation: ReputationService,
  ) {}

  async findAll(gameSlug: string | undefined) {
    const game = parseGame(gameSlug);
    if (!game) throw new BadRequestException("game is required");
    const coaches = await this.prisma.coachProfile.findMany({
      where: { game, active: true, reviewStatus: "APPROVED", user: { status: { not: "BANNED" } } },
      include: coachInclude(new Date()),
      orderBy: { createdAt: "desc" },
    });
    const summaries = coaches.map(toCoachSummary);
    summaries.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.reviewCount - a.reviewCount);
    return { coaches: summaries };
  }

  async findOne(viewerId: string, coachId: string) {
    const now = new Date();
    const coach = await this.prisma.coachProfile.findFirst({
      // The owner can open their own listing while it waits for review.
      where: { id: coachId, user: { status: { not: "BANNED" } }, OR: [{ reviewStatus: "APPROVED" }, { userId: viewerId }] },
      include: coachInclude(now),
    });
    if (!coach) throw new NotFoundException("Coach not found");
    const viewerIsCoach = coach.userId === viewerId;
    const [reviews, viewerCanReview, achievements] = await Promise.all([
      this.prisma.coachFeedback.findMany({ where: { coachId }, select: REVIEW_SELECT, orderBy: { createdAt: "desc" }, take: REVIEW_LIMIT }),
      viewerIsCoach ? false : this.canReview(coachId, viewerId, now),
      listAchievements(this.prisma, { coachProfileId: coachId }),
    ]);
    return { coach: toCoachSummary(coach), reviews, viewerCanReview, viewerIsCoach, achievements };
  }

  async findMine(userId: string) {
    const coach = await this.prisma.coachProfile.findUnique({ where: { userId }, include: coachInclude(new Date()) });
    return { coach: coach ? toCoachSummary(coach) : null, review: coach ? { note: coach.reviewNote, reviewedAt: coach.reviewedAt } : null };
  }

  /** Create or update the caller's listing. `active` is owned by setActive, so editing never unpauses. */
  async upsertMine(userId: string, dto: CreateCoachProfileDto) {
    const game = parseGame(dto.game);
    if (!game) throw new BadRequestException("game is required");
    const profile = await findActiveProfile(this.prisma, userId, game);
    if (!profile) throw new BadRequestException("Create a player profile for this game first");
    const specialties = cleanList(dto.specialties);
    const availability = cleanList(dto.availability);
    if (!specialties.length || !availability.length) throw new BadRequestException("Specialties and availability are required");
    const data = { game, specialties, hourlyRate: dto.hourlyRate, bio: dto.bio.trim(), availability };
    const existing = await this.prisma.coachProfile.findUnique({ where: { userId }, select: { reviewStatus: true } });
    const coach = await this.prisma.coachProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: existing?.reviewStatus === "REJECTED" ? { ...data, reviewStatus: "PENDING", reviewNote: null, reviewedAt: null } : data,
      include: coachInclude(new Date()),
    });
    return { coach: toCoachSummary(coach) };
  }

  listForAdmin(status: CoachReviewStatus | undefined) {
    return this.prisma.coachProfile.findMany({
      where: status ? { reviewStatus: status } : undefined,
      include: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  async review(id: string, dto: ReviewCoachDto) {
    const coach = await this.prisma.coachProfile.findUnique({ where: { id }, select: { id: true } });
    if (!coach) throw new NotFoundException("Coach not found");
    return this.prisma.coachProfile.update({
      where: { id },
      data: { reviewStatus: dto.status, reviewNote: dto.note ?? null, reviewedAt: new Date() },
    });
  }

  async setActive(userId: string, active: boolean) {
    const existing = await this.prisma.coachProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!existing) throw new NotFoundException("No coach profile yet");
    const coach = await this.prisma.coachProfile.update({ where: { userId }, data: { active }, include: coachInclude(new Date()) });
    return { coach: toCoachSummary(coach) };
  }

  async createFeedback(userId: string, coachId: string, dto: CreateFeedbackDto) {
    const coach = await this.prisma.coachProfile.findUnique({ where: { id: coachId }, select: { userId: true } });
    if (!coach) throw new NotFoundException("Coach not found");
    if (coach.userId === userId) throw new BadRequestException("Cannot review yourself");
    if (!(await this.canReview(coachId, userId, new Date()))) {
      throw new ForbiddenException("You can review once per agreed session after it starts");
    }
    const review = await this.prisma.coachFeedback.create({
      data: { coachId, playerId: userId, rating: dto.rating, comment: dto.comment.trim() },
      select: REVIEW_SELECT,
    });
    await Promise.all([
      this.reputation.recordEvent(coach.userId, "COACHING_COMPLETED", 2),
      this.reputation.recordEvent(userId, "COACHING_COMPLETED", 2),
    ]);
    return { review };
  }

  /** One review per agreed session whose start time has passed. */
  private async canReview(coachId: string, playerId: string, now: Date) {
    const [sessions, reviews] = await Promise.all([
      this.prisma.coachingRequest.count({ where: { coachId, playerId, status: "AGREED", proposedStartAt: { lt: now } } }),
      this.prisma.coachFeedback.count({ where: { coachId, playerId } }),
    ]);
    return sessions > reviews;
  }
}
