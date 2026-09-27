import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { NormalizeEmail, Trim } from "./normalize";

export class RegisterDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  displayName!: string;
}
