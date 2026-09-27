import { IsEmail, IsString, MaxLength } from "class-validator";
import { NormalizeEmail } from "./normalize";

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(72)
  password!: string;
}
