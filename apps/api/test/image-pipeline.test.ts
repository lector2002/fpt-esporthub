// Run: npm run test:api (from the repo root)
import { strict as assert } from "node:assert";
import sharp from "sharp";
import { InvalidImageError, MAX_UPLOAD_BYTES, processImage } from "../src/modules/media/image-pipeline";
import { isMediaKey } from "../src/modules/media/media-storage";

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

function solid(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 240, g: 127, b: 60 } } });
}

async function main() {
  await test("an avatar comes back as a 512 square WebP", async () => {
    const output = await processImage(await solid(900, 600).png().toBuffer(), "square");
    const meta = await sharp(output).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 512);
  });

  await test("a gallery picture keeps its shape and is never enlarged", async () => {
    const small = await sharp(await processImage(await solid(400, 300).jpeg().toBuffer(), "gallery")).metadata();
    assert.deepEqual([small.width, small.height], [400, 300]);
    const large = await sharp(await processImage(await solid(3200, 1600).png().toBuffer(), "gallery")).metadata();
    assert.deepEqual([large.width, large.height], [1600, 800]);
  });

  await test("camera metadata such as GPS is stripped", async () => {
    const input = await solid(300, 300).jpeg().withExifMerge({ IFD0: { Copyright: "secret-location" } }).toBuffer();
    assert.ok((await sharp(input).metadata()).exif);
    const meta = await sharp(await processImage(input, "gallery")).metadata();
    assert.equal(meta.exif, undefined);
  });

  await test("SVG is refused", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    await assert.rejects(processImage(svg, "square"), InvalidImageError);
  });

  await test("a file that is not an image is refused", async () => {
    await assert.rejects(processImage(Buffer.from("<?php echo 1; ?>"), "square"), InvalidImageError);
  });

  await test("an empty or oversized upload is refused before decoding", async () => {
    await assert.rejects(processImage(Buffer.alloc(0), "square"), InvalidImageError);
    await assert.rejects(processImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1), "square"), InvalidImageError);
  });

  await test("a picture above the pixel limit is refused", async () => {
    const bomb = await solid(8000, 8000).png({ compressionLevel: 9 }).toBuffer();
    assert.ok(bomb.length <= MAX_UPLOAD_BYTES);
    await assert.rejects(processImage(bomb, "gallery"), InvalidImageError);
  });

  await test("only generated keys map to files", () => {
    assert.ok(isMediaKey("0f8fad5b-d9cb-469f-a165-70867728950e.webp"));
    for (const key of ["../.env", "0f8fad5b-d9cb-469f-a165-70867728950e.webp/..", "0f8fad5b-d9cb-469f-a165-70867728950e.svg", "a.webp"]) {
      assert.equal(isMediaKey(key), false, key);
    }
  });

  console.log(`${passed} passed`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
