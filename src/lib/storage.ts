import { mkdir, open, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export type ByteRange = { start: number; end: number };
// Implement this interface to switch to a private S3-compatible bucket.
export interface PrivateStorage {
  put(data: Buffer): Promise<string>;
  // The whole file, or the bytes from `start` to `end` included.
  get(key: string, range?: ByteRange): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
/* The part of a file a browser asks for with a `Range` header, as video players do to seek and
   as Safari requires to play at all: "bytes=0-1", "bytes=500-" or "bytes=-200" (the end).
   `null`: no usable range, send the whole file. `false`: a range outside the file. */
export function byteRange(header: string | null, size: number): ByteRange | null | false {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start > end ? false : { start, end };
}
const root = path.resolve(
  /* turbopackIgnore: true */ process.env.STORAGE_DIR || './storage/private',
);
function location(key: string) {
  if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Clé invalide.');
  return path.join(/* turbopackIgnore: true */ root, key);
}
export const storage: PrivateStorage = {
  async put(data) {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const key = randomUUID();
    await writeFile(location(key), data, { mode: 0o600 });
    return key;
  },
  async get(key, range) {
    if (!range) return readFile(/* turbopackIgnore: true */ location(key));
    const file = await open(/* turbopackIgnore: true */ location(key));
    try {
      const data = Buffer.alloc(range.end - range.start + 1);
      const { bytesRead } = await file.read(data, 0, data.length, range.start);
      return data.subarray(0, bytesRead);
    } finally {
      await file.close();
    }
  },
  async remove(key) {
    await unlink(location(key)).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });
  },
};
