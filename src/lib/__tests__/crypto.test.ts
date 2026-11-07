import { describe, it, expect, beforeAll } from "vitest";
import { encryptCredential, decryptCredential } from "../crypto";

describe("Crypto Utility (AES-256-GCM)", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("should encrypt and decrypt a plain text string accurately", () => {
    const secret = "SuperSecretToken123!@#$";
    const encrypted = encryptCredential(secret);

    expect(encrypted).not.toEqual(secret);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("should handle empty or falsy inputs gracefully", () => {
    expect(encryptCredential("")).toBe("");
    expect(decryptCredential("")).toBe("");
  });

  it("should produce different ciphertexts for the same plaintext due to random IVs", () => {
    const text = "my-api-key-999";
    const enc1 = encryptCredential(text);
    const enc2 = encryptCredential(text);

    expect(enc1).not.toBe(enc2);
    expect(decryptCredential(enc1)).toBe(text);
    expect(decryptCredential(enc2)).toBe(text);
  });

  it("should fail decryption when ciphertext or auth tag is corrupted", () => {
    const encrypted = encryptCredential("valid-secret");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext hex
    const corrupted = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;

    expect(() => decryptCredential(corrupted)).toThrow();
  });
});
