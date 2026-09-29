import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@fpt-esporthub/database";

// Sign-up needs the emailed link, so specs confirm test accounts straight in the database.
// DATABASE_URL comes from the environment or the root .env (dev stack); E2E_BASE_URL stacks must pass it in.
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(".env")) return undefined;
  const line = readFileSync(".env", "utf8").split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL="));
  return line?.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
}

let client: PrismaClient | null = null;
function prisma() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is needed to confirm test accounts (set it or run from the repo root with .env)");
  client ??= new PrismaClient({ datasourceUrl: url });
  return client;
}

/** What opening the sign-up link does, without the email. */
export async function markEmailVerified(email: string) {
  await prisma().user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
}

/** Replaces the user's emailed link with one the spec knows, returning the raw token for `/verify-email?token=`. */
export async function issueVerificationToken(email: string) {
  const token = randomBytes(32).toString("hex");
  const user = await prisma().user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  await prisma().emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await prisma().emailVerificationToken.create({
    data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60_000) },
  });
  return token;
}
