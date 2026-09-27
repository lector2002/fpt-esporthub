import { IsEmail } from "class-validator";
import { NormalizeEmail } from "./normalize";

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}
