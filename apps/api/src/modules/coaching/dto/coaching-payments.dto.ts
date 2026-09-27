import { IsIn, IsInt, IsString, Length, Max, Min } from "class-validator";

export class ResolveDisputeDto {
  @IsIn(["release", "refund"])
  outcome!: "release" | "refund";
}

export class RecordPayoutDto {
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  amount!: number;

  /** Bank transfer reference or similar, kept on the ledger. */
  @IsString()
  @Length(3, 200)
  note!: string;
}
