import { randomUUID } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ROOT = path.resolve(__dirname, '../storage/uploads');
export class MediaError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function photoFilePath(filename: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(filename)) throw new MediaError('Invalid photo identifier.');
  return path.join(ROOT, filename);
}
export async function decodeImage(input: Buffer) {
  if (input.length > MAX_IMAGE_BYTES) throw new MediaError('Photos must be 5 MiB or smaller.', 413);
  const png = input.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  const webp = input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpeg && !webp) throw new MediaError('Choose a static JPEG, PNG or WebP photo.');
  if (png) for (let offset = 8; offset + 12 <= input.length;) {
    const length = input.readUInt32BE(offset);
    if (input.toString('ascii', offset + 4, offset + 8) === 'acTL') throw new MediaError('Animated photos are not supported.');
    if (length > input.length - offset - 12) break;
    offset += length + 12;
  }
  try {
    const image = sharp(input, { limitInputPixels: 25_000_000, animated: true, failOn: 'error' });
    const meta = await image.metadata();
    if (!['jpeg','png','webp'].includes(meta.format || '') || !meta.width || !meta.height || meta.width * meta.height > 25_000_000 || (meta.pages || 1) > 1) throw new MediaError('Choose a static photo of at most 25 million pixels.');
    const { data, info } = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    return { buffer: data, mime: 'image/webp' as const, width: info.width, height: info.height };
  } catch (err) { if (err instanceof MediaError) throw err; throw new MediaError('This photo could not be decoded. Use a valid static JPEG, PNG or WebP under 25 million pixels.'); }
}
export async function writePhoto(input: Buffer) {
  const decoded = await decodeImage(input), filename = `${randomUUID()}.webp`;
  await mkdir(ROOT, { recursive: true });
  const file = await open(photoFilePath(filename), 'wx');
  try { await file.writeFile(decoded.buffer); }
  catch (error) { await file.close(); await unlink(photoFilePath(filename)).catch(() => {}); throw error; }
  await file.close();
  return { filename, bytes: decoded.buffer.length, mime: decoded.mime, width: decoded.width, height: decoded.height };
}
export async function removePhotoFile(filename: string): Promise<void> { await unlink(photoFilePath(filename)); }
