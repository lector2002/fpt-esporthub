import sharp from "sharp";

/**
 * Every upload is decoded and re-encoded to WebP: that drops EXIF (GPS, device), defeats polyglot files and
 * normalises size. Pure (no Nest, no disk) so the rules can be unit tested.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Decompression-bomb guard: refuse anything above ~40 megapixels before decoding it fully. */
const MAX_INPUT_PIXELS = 40_000_000;
/** SVG is refused on purpose: it is a document, not a picture, and runs through a much larger parser. */
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

/** "square": avatars and logos, cropped to fill. "cover": 3:1 card covers, cropped to fill. "gallery": achievement pictures, kept whole. */
export type ImageKind = "square" | "cover" | "gallery";

export class InvalidImageError extends Error {}

export async function processImage(input: Buffer, kind: ImageKind): Promise<Buffer> {
  if (input.length === 0 || input.length > MAX_UPLOAD_BYTES) throw new InvalidImageError("Image must be 5 MB or less");
  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()).format;
  } catch {
    throw new InvalidImageError("File is not a supported image");
  }
  if (!format || !ALLOWED_FORMATS.has(format)) throw new InvalidImageError("Use a JPG, PNG, WebP or GIF image");

  // Animated GIF/WebP: only the first frame is kept.
  const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false }).rotate();
  const sized =
    kind === "square"
      ? image.resize(512, 512, { fit: "cover", position: "attention" })
      : kind === "cover"
        ? image.resize(1500, 500, { fit: "cover", position: "attention" })
        : image.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  try {
    return await sized.webp({ quality: 82 }).toBuffer();
  } catch {
    throw new InvalidImageError("File is not a supported image");
  }
}
