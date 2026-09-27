// Run: npm run guides:import [-- ahri zed] (from the repo root). No names = every champion, same as the nightly job.
import "../src/env";
import { PrismaClient } from "@fpt-esporthub/database";
import { importOpgg } from "../src/modules/guides/guides-import";
import { createPoliteFetcher } from "../src/modules/guides/sources/polite-fetch";

const prisma = new PrismaClient();
const champions = process.argv.slice(2).map((name) => name.toLowerCase());

importOpgg(prisma, createPoliteFetcher(), { champions, log: console.log })
  .then((result) => {
    console.log(`saved ${result.saved}, removed ${result.removed}, failed ${result.failed.length}${result.failed.length ? `: ${result.failed.join(", ")}` : ""}`);
    process.exitCode = result.failed.length ? 1 : 0;
  })
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
