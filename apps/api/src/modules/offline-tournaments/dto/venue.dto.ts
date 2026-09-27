import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from "class-validator";

export class ApplyVenueDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsString()
  @Length(5, 200)
  address!: string;

  @IsString()
  @Length(2, 60)
  city!: string;

  @IsInt()
  @Min(10)
  @Max(1000)
  pcCount!: number;

  @IsOptional()
  @Matches(/^[0-9+ ]{8,15}$/, { message: "phone must be 8-15 digits" })
  phone?: string;
}

export class ReviewVenueDto {
  @IsIn(["APPROVED", "REJECTED"])
  status!: "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
