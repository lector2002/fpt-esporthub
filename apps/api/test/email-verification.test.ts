// Run: npm run test:api (from the repo root)
import "reflect-metadata";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import { AuthService } from "../src/modules/auth/auth.service";
import type { EmailService } from "../src/modules/email/email.service";
import type { PrismaService } from "../src/modules/prisma/prisma.service";

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

type Row = Record<string, unknown> & { id: string };

/** Just enough of Prisma for the auth flows: users and verification tokens in memory. */
function fakePrisma() {
  const users: Row[] = [];
  let tokens: Row[] = [];
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
        users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null,
      create: async ({ data }: { data: Row }) => {
        const user = { ...data, id: `u${users.length + 1}`, role: "USER", status: "ACTIVE", emailVerifiedAt: null, createdAt: new Date() };
        users.push(user);
        return user;
      },
      update: async ({ where, data }: { where: { id: string }; data: Row }) => {
        const user = users.find((u) => u.id === where.id)!;
        Object.assign(user, data);
        return user;
      },
    },
    emailVerificationToken: {
      findUnique: async ({ where }: { where: { tokenHash: string } }) => tokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
      create: async ({ data }: { data: Row }) => tokens.push({ ...data, id: `t${tokens.length + 1}` }),
      deleteMany: async ({ where }: { where: { userId: string } }) => {
        tokens = tokens.filter((t) => t.userId !== where.userId);
      },
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  return { prisma, users, tokens: () => tokens };
}

function setup() {
  const db = fakePrisma();
  const links: string[] = [];
  const email = { sendEmailVerification: async (_to: string, link: string) => void links.push(link) };
  const jwt = { sign: () => "signed-jwt" };
  const auth = new AuthService(jwt as unknown as JwtService, db.prisma as unknown as PrismaService, email as unknown as EmailService);
  const tokenOf = (link: string) => new URL(link).searchParams.get("token")!;
  return { auth, db, links, tokenOf };
}

const account = { email: "new@player.vn", password: "Password123!", displayName: "NewPlayer" };

async function main() {
  await test("register sends a link instead of signing the user in", async () => {
    const { auth, links } = setup();
    const result = await auth.register(account);
    assert.equal("accessToken" in result, false);
    assert.equal(links.length, 1);
    assert.match(links[0], /\/verify-email\?token=[0-9a-f]{64}$/);
  });

  await test("login is refused until the email is verified", async () => {
    const { auth } = setup();
    await auth.register(account);
    await assert.rejects(auth.login({ email: account.email, password: account.password }), (error: unknown) => error instanceof ForbiddenException && error.message === "Email not verified");
  });

  await test("opening the link verifies the email, signs in and uses up the token", async () => {
    const { auth, db, links, tokenOf } = setup();
    await auth.register(account);
    const result = await auth.verifyEmail({ token: tokenOf(links[0]) });
    assert.equal(result.accessToken, "signed-jwt");
    assert.ok(db.users[0].emailVerifiedAt instanceof Date);
    assert.equal(db.tokens().length, 0);
    await assert.rejects(auth.verifyEmail({ token: tokenOf(links[0]) }), BadRequestException);
    assert.equal((await auth.login({ email: account.email, password: account.password })).accessToken, "signed-jwt");
  });

  await test("an expired link is rejected", async () => {
    const { auth, db, links, tokenOf } = setup();
    await auth.register(account);
    db.tokens()[0].expiresAt = new Date(Date.now() - 1000);
    await assert.rejects(auth.verifyEmail({ token: tokenOf(links[0]) }), BadRequestException);
    assert.equal(db.users[0].emailVerifiedAt, null);
  });

  await test("resend replaces the old link and ignores verified or unknown emails", async () => {
    const { auth, db, links, tokenOf } = setup();
    await auth.register(account);
    await auth.resendVerification({ email: account.email });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(links.length, 2);
    assert.equal(db.tokens().length, 1);
    assert.equal(db.tokens()[0].tokenHash, createHash("sha256").update(tokenOf(links[1])).digest("hex"));
    await assert.rejects(auth.verifyEmail({ token: tokenOf(links[0]) }), BadRequestException);

    await auth.verifyEmail({ token: tokenOf(links[1]) });
    const same = await auth.resendVerification({ email: account.email });
    const unknown = await auth.resendVerification({ email: "nobody@player.vn" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(links.length, 2);
    assert.deepEqual(same, unknown);
  });

  console.log(`\n${passed} passed`);
}

void main();
