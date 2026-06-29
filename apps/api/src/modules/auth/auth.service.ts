import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
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

    const token = this.signToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
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

    const token = this.signToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
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

    if (!user) {
      return this.forgotPasswordResponse();
    }

    const resetToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return this.forgotPasswordResponse(resetToken);
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

  private forgotPasswordResponse(resetToken?: string) {
    return {
      message: "If an account exists for this email, a reset link will be available shortly.",
      ...(process.env.NODE_ENV !== "production" && resetToken ? { resetToken } : {}),
    };
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
