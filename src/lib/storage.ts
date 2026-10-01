import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
// Implement this interface to switch to a private S3-compatible bucket.
export interface PrivateStorage {
  put(data: Buffer): Promise<string>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
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
  async get(key) {
    return readFile(/* turbopackIgnore: true */ location(key));
  },
  async remove(key) {
    await unlink(location(key)).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });
  },
};
