import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("ENCRYPTION_KEY environment variable is not defined");
  }

  // If 64 hex characters, parse as hex (32 bytes)
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  // If 32-character string, use as UTF-8 buffer
  if (rawKey.length === 32) {
    return Buffer.from(rawKey, "utf-8");
  }

  // Fallback: derive 32-byte key using sha256
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypt sensitive plain text using AES-256-GCM.
 * Returns format: "iv:authTag:ciphertext" in hex encoding.
 */
export function encryptCredential(plainText: string): string {
  if (!plainText) return "";

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt cipher text produced by encryptCredential.
 * Expects format: "iv:authTag:ciphertext" in hex encoding.
 */
export function decryptCredential(cipherText: string): string {
  if (!cipherText) return "";

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted credential format. Expected iv:tag:ciphertext");
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
