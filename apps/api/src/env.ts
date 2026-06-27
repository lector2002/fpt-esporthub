import { existsSync } from "node:fs";
import { resolve } from "node:path";
import * as dotenv from "dotenv";

for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(path)) {
    dotenv.config({ path });
  }
}
