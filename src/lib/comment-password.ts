import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const keyLength = 32;
const hashPrefix = "scrypt:v1";

function scryptKey(password: string, salt: string, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Buffer.from(key));
    });
  });
}

export async function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptKey(password, salt, keyLength);
  return `${hashPrefix}:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, version, salt, key] = storedHash.split(":");
  if (`${algorithm}:${version}` !== hashPrefix || !salt || !key) return false;

  const expected = Buffer.from(key, "hex");
  const actual = await scryptKey(password, salt, expected.length);
  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}
