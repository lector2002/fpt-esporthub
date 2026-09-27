import { Transform } from "class-transformer";

/** Trims a string field. Non-strings pass through so the validators reject them. */
export const Trim = () => Transform(({ value }) => (typeof value === "string" ? value.trim() : value));

/** Trims and lowercases an email so lookups are case-insensitive. */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value));
