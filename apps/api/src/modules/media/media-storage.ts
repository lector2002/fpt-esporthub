import "../../env";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InvalidImageError, processImage, type ImageKind } from "./image-pipeline";

/** Keys are random and never reused, so files can be cached forever. Anything else never reaches the filesystem. */
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function isMediaKey(key: string) {
  return KEY_PATTERN.test(key);
}

/** Uploaded pictures on local disk (a Docker volume in production, see deploy/docker-compose.yml). */
@Injectable()
export class MediaStorage {
  private readonly logger = new Logger(MediaStorage.name);
  readonly dir = resolve(process.env.UPLOAD_DIR ?? "uploads");

  constructor() {
    mkdirSync(this.dir, { recursive: true });
  }

  /** Validates, re-encodes and stores the picture. Returns its key. */
  async save(input: Buffer | undefined, kind: ImageKind): Promise<string> {
    if (!input) throw new BadRequestException("Choose an image to upload");
    let output: Buffer;
    try {
      output = await processImage(input, kind);
    } catch (error) {
      if (error instanceof InvalidImageError) throw new BadRequestException(error.message);
      throw error;
    }
    const key = `${randomUUID()}.webp`;
    await writeFile(join(this.dir, key), output, { flag: "wx" });
    return key;
  }

  /** Best effort: a missing file is fine, the row pointing at it is what matters. */
  async remove(key: string | null | undefined) {
    if (!key || !isMediaKey(key)) return;
    await unlink(join(this.dir, key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") this.logger.warn(`Could not delete media ${key}`);
    });
  }

  pathOf(key: string) {
    return isMediaKey(key) ? join(this.dir, key) : null;
  }
}
