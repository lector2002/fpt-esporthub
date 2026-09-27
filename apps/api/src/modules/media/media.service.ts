import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { assertCanInteract } from "../../common/account";
import { PrismaService } from "../prisma/prisma.service";
import type { AddAchievementDto } from "./dto/add-achievement.dto";
import { ACHIEVEMENT_SELECT, MAX_ACHIEVEMENTS } from "./achievement-view";
import { MediaStorage } from "./media-storage";

type Owner = { userId: string } | { teamId: string } | { coachProfileId: string };
/** User pictures: avatar (square) or card cover (3:1). Team pictures: logo (square) or card cover. */
type UserPicture = "avatarKey" | "coverKey";
type TeamPicture = "logoKey" | "coverKey";
type CommunityPicture = "iconKey" | "coverKey";
const kindOf = (field: UserPicture | TeamPicture | CommunityPicture) => (field === "coverKey" ? "cover" : "square");

/**
 * Who may change which picture. Ownership is checked before anything is written to disk,
 * and an old file is deleted only after the row points at the new one (or at nothing).
 */
@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: MediaStorage,
  ) {}

  async setUserPicture(userId: string, field: UserPicture, file: Buffer | undefined) {
    await assertCanInteract(this.prisma, userId);
    const previous = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true, coverKey: true } });
    const key = await this.storage.save(file, kindOf(field));
    await this.prisma.user.update({ where: { id: userId }, data: field === "avatarKey" ? { avatarKey: key } : { coverKey: key } });
    await this.storage.remove(previous?.[field]);
    return { [field]: key };
  }

  async clearUserPicture(userId: string, field: UserPicture) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true, coverKey: true } });
    if (!user) throw new NotFoundException("User not found");
    await this.prisma.user.update({ where: { id: userId }, data: field === "avatarKey" ? { avatarKey: null } : { coverKey: null } });
    await this.storage.remove(user[field]);
    return { [field]: null };
  }

  async setTeamPicture(teamId: string, userId: string, field: TeamPicture, file: Buffer | undefined) {
    const team = await this.requireCaptain(teamId, userId);
    await assertCanInteract(this.prisma, userId);
    const key = await this.storage.save(file, kindOf(field));
    await this.prisma.team.update({ where: { id: teamId }, data: field === "logoKey" ? { logoKey: key } : { coverKey: key } });
    await this.storage.remove(team[field]);
    return { [field]: key };
  }

  async clearTeamPicture(teamId: string, userId: string | null, field: TeamPicture) {
    const team = userId ? await this.requireCaptain(teamId, userId) : await this.findTeam(teamId);
    await this.prisma.team.update({ where: { id: teamId }, data: field === "logoKey" ? { logoKey: null } : { coverKey: null } });
    await this.storage.remove(team[field]);
    return { [field]: null };
  }

  async setCommunityPicture(communityId: string, userId: string, field: CommunityPicture, file: Buffer | undefined) {
    const community = await this.requireCommunityOwner(communityId, userId);
    await assertCanInteract(this.prisma, userId);
    const key = await this.storage.save(file, kindOf(field));
    await this.prisma.community.update({ where: { id: communityId }, data: field === "iconKey" ? { iconKey: key } : { coverKey: key } });
    await this.storage.remove(community[field]);
    return { [field]: key };
  }

  async clearCommunityPicture(communityId: string, userId: string | null, field: CommunityPicture) {
    const community = userId ? await this.requireCommunityOwner(communityId, userId) : await this.findCommunity(communityId);
    await this.prisma.community.update({ where: { id: communityId }, data: field === "iconKey" ? { iconKey: null } : { coverKey: null } });
    await this.storage.remove(community[field]);
    return { [field]: null };
  }

  async addAchievement(userId: string, dto: AddAchievementDto, file: Buffer | undefined) {
    await assertCanInteract(this.prisma, userId);
    const owner = await this.resolveOwner(userId, dto);
    const count = await this.prisma.achievement.count({ where: owner });
    if (count >= MAX_ACHIEVEMENTS) throw new ConflictException(`Up to ${MAX_ACHIEVEMENTS} achievements`);
    const imageKey = await this.storage.save(file, "gallery");
    const achievement = await this.prisma.achievement.create({
      data: { ...owner, title: dto.title.trim(), imageKey },
      select: ACHIEVEMENT_SELECT,
    });
    return { achievement };
  }

  /** The player, the team captain or the coach who owns it. Admins pass `userId = null`. */
  async removeAchievement(id: string, userId: string | null) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
      select: { imageKey: true, userId: true, team: { select: { captainId: true } }, coachProfile: { select: { userId: true } } },
    });
    if (!achievement) throw new NotFoundException("Achievement not found");
    const ownerId = achievement.userId ?? achievement.team?.captainId ?? achievement.coachProfile?.userId;
    if (userId && ownerId !== userId) throw new ForbiddenException("You can't remove this achievement");
    await this.prisma.achievement.delete({ where: { id } });
    await this.storage.remove(achievement.imageKey);
    return { success: true };
  }

  private async resolveOwner(userId: string, dto: AddAchievementDto): Promise<Owner> {
    if (dto.owner === "user") return { userId };
    if (dto.owner === "team") {
      if (!dto.teamId) throw new BadRequestException("teamId is required");
      await this.requireCaptain(dto.teamId, userId);
      return { teamId: dto.teamId };
    }
    const coach = await this.prisma.coachProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!coach) throw new NotFoundException("Create your coach listing first");
    return { coachProfileId: coach.id };
  }

  private async findTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { captainId: true, logoKey: true, coverKey: true } });
    if (!team) throw new NotFoundException("Team not found");
    return team;
  }

  private async findCommunity(communityId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { ownerId: true, iconKey: true, coverKey: true } });
    if (!community) throw new NotFoundException("Community not found");
    return community;
  }

  private async requireCommunityOwner(communityId: string, userId: string) {
    const community = await this.findCommunity(communityId);
    if (community.ownerId !== userId) throw new ForbiddenException("Only the community owner can do this");
    return community;
  }

  private async requireCaptain(teamId: string, userId: string) {
    const team = await this.findTeam(teamId);
    if (team.captainId !== userId) throw new ForbiddenException("Only the team captain can do this");
    return team;
  }
}
