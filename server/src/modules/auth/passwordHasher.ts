import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Password hashing with Node's built-in scrypt (memory-hard, no native dependency).
 * Stored format: `scrypt$<N>$<r>$<p>$<saltBase64>$<hashBase64>` so parameters can be raised later
 * without invalidating existing hashes.
 */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const DEFAULT_PARAMS = { N: 16_384, r: 8, p: 1 } as const;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, DEFAULT_PARAMS);
  const { N, r, p } = DEFAULT_PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, N, r, p, saltBase64, hashBase64] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !saltBase64 || !hashBase64) return false;

  const expected = Buffer.from(hashBase64, 'base64');
  const actual = await deriveKey(password, Buffer.from(saltBase64, 'base64'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Pre-computed hash used to keep login timing constant when the email does not exist. */
let dummyHashPromise: Promise<string> | null = null;
export function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyHashPromise;
}
