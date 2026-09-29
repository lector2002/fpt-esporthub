import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResendVerificationDto, VerifyEmailDto } from "./dto/verify-email.dto";
import { EmailService } from "../email/email.service";

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const VERIFY_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const FORGOT_PASSWORD_MESSAGE = "If an account exists for this email, a reset link has been sent.";
const RESEND_VERIFICATION_MESSAGE = "If this email is waiting for confirmation, a new link has been sent.";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    await this.issueVerificationLink(user.id, user.email);

    return { message: "Check your email to confirm the account.", email: user.email };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status === "BANNED") {
      throw new ForbiddenException("Account suspended");
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException("Email not verified");
    }

    const token = this.signToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  /** Opens the sign-up link: marks the email verified and signs the user in. */
  async verifyEmail(dto: VerifyEmailDto) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashResetToken(dto.token) },
    });

    if (!record || record.expiresAt <= new Date()) {
      throw new BadRequestException("Invalid or expired verification link");
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

    if (user.status === "BANNED") {
      throw new ForbiddenException("Account suspended");
    }

    return {
      user: this.sanitizeUser(user),
      accessToken: this.signToken(user.id, user.email, user.role),
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user && !user.emailVerifiedAt) {
      // Not awaited, same reason as forgotPassword.
      void this.issueVerificationLink(user.id, user.email).catch(() => {
        this.logger.error("Could not issue an email verification link.");
      });
    }

    return { message: RESEND_VERIFICATION_MESSAGE };
  }

  private async issueVerificationLink(userId: string, email: string) {
    const token = randomBytes(32).toString("hex");

    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashResetToken(token),
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    });

    await this.emailService.sendEmailVerification(email, `${this.webOrigin()}/verify-email?token=${token}`);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return { user: this.sanitizeUser(user) };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      // Not awaited: response time must not reveal whether the account exists.
      void this.issueResetLink(user.id, user.email).catch(() => {
        this.logger.error("Could not issue a password reset link.");
      });
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  private async issueResetLink(userId: string, email: string) {
    const resetToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordReset(email, `${this.webOrigin()}/reset-password?token=${resetToken}`);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.expiresAt <= new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return { message: "Password reset successful" };
  }

  private webOrigin() {
    return (process.env.WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
  }

  private signToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  private hashResetToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    createdAt: Date;
    passwordHash?: string | null;
    updatedAt?: Date;
  }) {
    const { passwordHash: _, updatedAt: __, ...safe } = user as Record<string, unknown>;
    return safe as {
      id: string;
      email: string;
      displayName: string;
      role: string;
      status: string;
      createdAt: Date;
    };
  }
}
