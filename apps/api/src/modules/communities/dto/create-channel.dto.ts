import { IsIn, IsString, Length } from "class-validator";

export class CreateChannelDto {
  @IsString()
  @Length(1, 32)
  name!: string;

  @IsIn(["text", "voice"])
  kind!: "text" | "voice";
}
