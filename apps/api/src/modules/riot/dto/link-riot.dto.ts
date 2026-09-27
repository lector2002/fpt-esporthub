import { IsString, Matches } from "class-validator";

export class LinkRiotDto {
  @IsString()
  @Matches(/^[^#]{3,16}#[A-Za-z0-9]{3,5}$/, { message: "riotId must look like Name#TAG" })
  riotId!: string;
}
