import { IsEmail, IsHexadecimal, IsString, Length } from "class-validator";
import { NormalizeEmail } from "./normalize";

export class VerifyEmailDto {
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;
}

export class ResendVerificationDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}
