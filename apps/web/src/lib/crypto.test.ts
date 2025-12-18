/// <reference lib="dom" />

import { describe, expect, test } from "bun:test";
import {
	decryptData,
	deriveKeyFromPassword,
	encryptData,
	exportKeyToString,
	generateMasterKey,
	generateSalt,
	importKeyFromString,
	unwrapMasterKey,
	wrapMasterKey,
} from "./crypto";

describe("crypto utilities", () => {
	describe("generateSalt", () => {
		test("generates a 32-character hex string (16 bytes)", () => {
			const salt = generateSalt();
			expect(salt).toHaveLength(32);
			expect(salt).toMatch(/^[0-9a-f]+$/);
		});

		test("generates unique salts", () => {
			const salt1 = generateSalt();
			const salt2 = generateSalt();
			expect(salt1).not.toBe(salt2);
		});
	});

	describe("generateMasterKey", () => {
		test("generates a valid AES-GCM CryptoKey", async () => {
			const key = await generateMasterKey();
			expect(key).toBeInstanceOf(CryptoKey);
			expect(key.algorithm.name).toBe("AES-GCM");
			expect(key.extractable).toBe(true);
			expect(key.usages).toContain("encrypt");
			expect(key.usages).toContain("decrypt");
		});
	});

	describe("deriveKeyFromPassword", () => {
		test("derives a CryptoKey from password and salt", async () => {
			const password = "test-password-123";
			const salt = generateSalt();
			const key = await deriveKeyFromPassword(password, salt);

			expect(key).toBeInstanceOf(CryptoKey);
			expect(key.algorithm.name).toBe("AES-GCM");
			expect(key.extractable).toBe(false);
			expect(key.usages).toContain("encrypt");
			expect(key.usages).toContain("decrypt");
			expect(key.usages).toContain("wrapKey");
			expect(key.usages).toContain("unwrapKey");
		});

		test("same password and salt produce the same key", async () => {
			const password = "consistent-password";
			const salt = generateSalt();

			const key1 = await deriveKeyFromPassword(password, salt);
			const key2 = await deriveKeyFromPassword(password, salt);

			const testData = "test data for comparison";
			const encrypted1 = await encryptData(key1, testData);
			const decrypted = await decryptData(key2, encrypted1);

			expect(decrypted).toBe(testData);
		});

		test("different passwords produce different keys", async () => {
			const salt = generateSalt();
			const key1 = await deriveKeyFromPassword("password1", salt);
			const key2 = await deriveKeyFromPassword("password2", salt);

			const testData = "test data";
			const encrypted = await encryptData(key1, testData);

			expect(decryptData(key2, encrypted)).rejects.toThrow();
		});

		test("different salts produce different keys", async () => {
			const password = "same-password";
			const salt1 = generateSalt();
			const salt2 = generateSalt();

			const key1 = await deriveKeyFromPassword(password, salt1);
			const key2 = await deriveKeyFromPassword(password, salt2);

			const testData = "test data";
			const encrypted = await encryptData(key1, testData);

			expect(decryptData(key2, encrypted)).rejects.toThrow();
		});
	});

	describe("encryptData and decryptData", () => {
		test("encrypts and decrypts data correctly", async () => {
			const key = await generateMasterKey();
			const plaintext = "Hello, World! This is a secret message.";

			const encrypted = await encryptData(key, plaintext);
			const decrypted = await decryptData(key, encrypted);

			expect(decrypted).toBe(plaintext);
		});

		test("encrypted data has correct format (IV:CIPHERTEXT)", async () => {
			const key = await generateMasterKey();
			const encrypted = await encryptData(key, "test");

			expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
			const parts = encrypted.split(":");
			const iv = parts[0];
			const ciphertext = parts[1];
			expect(iv).toBeDefined();
			expect(iv).toHaveLength(24); // 12 bytes = 24 hex chars
			expect(ciphertext).toBeDefined();
			if (ciphertext) {
				expect(ciphertext.length).toBeGreaterThan(0);
			}
		});

		test("same plaintext produces different ciphertext (due to random IV)", async () => {
			const key = await generateMasterKey();
			const plaintext = "Same message";

			const encrypted1 = await encryptData(key, plaintext);
			const encrypted2 = await encryptData(key, plaintext);

			expect(encrypted1).not.toBe(encrypted2);

			expect(await decryptData(key, encrypted1)).toBe(plaintext);
			expect(await decryptData(key, encrypted2)).toBe(plaintext);
		});

		test("handles empty string", async () => {
			const key = await generateMasterKey();
			const encrypted = await encryptData(key, "");
			const decrypted = await decryptData(key, encrypted);
			expect(decrypted).toBe("");
		});

		test("handles unicode characters", async () => {
			const key = await generateMasterKey();
			const plaintext = "Hello 世界! 🔐 Émojis & spëcial çhàracters çığöşü";

			const encrypted = await encryptData(key, plaintext);
			const decrypted = await decryptData(key, encrypted);

			expect(decrypted).toBe(plaintext);
		});

		test("handles large data", async () => {
			const key = await generateMasterKey();
			const plaintext = "A".repeat(100000);

			const encrypted = await encryptData(key, plaintext);
			const decrypted = await decryptData(key, encrypted);

			expect(decrypted).toBe(plaintext);
		});

		test("decryption fails with wrong key", async () => {
			const key1 = await generateMasterKey();
			const key2 = await generateMasterKey();

			const encrypted = await encryptData(key1, "secret");

			expect(decryptData(key2, encrypted)).rejects.toThrow();
		});

		test("decryption fails with invalid payload format", async () => {
			const key = await generateMasterKey();

			expect(decryptData(key, "invalid")).rejects.toThrow(
				"Invalid encrypted payload format",
			);
			expect(decryptData(key, "")).rejects.toThrow(
				"Invalid encrypted payload format",
			);
		});

		test("decryption fails with tampered ciphertext", async () => {
			const key = await generateMasterKey();
			const encrypted = await encryptData(key, "secret");

			// tamper with the ciphertext
			const parts = encrypted.split(":");
			const iv = parts[0];
			const ciphertext = parts[1];
			if (!iv || !ciphertext) {
				throw new Error("Invalid encrypted format");
			}
			const tamperedCiphertext = `${ciphertext.slice(0, -2)} 00`;
			const tampered = `${iv}:${tamperedCiphertext}`;

			expect(decryptData(key, tampered)).rejects.toThrow();
		});
	});

	describe("wrapMasterKey and unwrapMasterKey", () => {
		test("wraps and unwraps master key correctly", async () => {
			const masterKey = await generateMasterKey();
			const password = "wrap-test-password";
			const salt = generateSalt();
			const kek = await deriveKeyFromPassword(password, salt);

			const wrapped = await wrapMasterKey(masterKey, kek);
			const unwrapped = await unwrapMasterKey(wrapped, kek);

			const testData = "test encryption with unwrapped key";
			const encrypted = await encryptData(masterKey, testData);
			const decrypted = await decryptData(unwrapped, encrypted);

			expect(decrypted).toBe(testData);
		});

		test("wrapped key has correct format", async () => {
			const masterKey = await generateMasterKey();
			const salt = generateSalt();
			const kek = await deriveKeyFromPassword("password", salt);

			const wrapped = await wrapMasterKey(masterKey, kek);

			expect(wrapped).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
			const [iv] = wrapped.split(":");
			expect(iv).toHaveLength(24); // 12 bytes = 24 hex chars
		});

		test("unwrapping fails with wrong KEK", async () => {
			const masterKey = await generateMasterKey();
			const salt1 = generateSalt();
			const salt2 = generateSalt();
			const kek1 = await deriveKeyFromPassword("password1", salt1);
			const kek2 = await deriveKeyFromPassword("password2", salt2);

			const wrapped = await wrapMasterKey(masterKey, kek1);

			expect(unwrapMasterKey(wrapped, kek2)).rejects.toThrow();
		});

		test("unwrapping fails with invalid payload format", async () => {
			const salt = generateSalt();
			const kek = await deriveKeyFromPassword("password", salt);

			expect(unwrapMasterKey("invalid", kek)).rejects.toThrow(
				"Invalid wrapped key payload format",
			);
		});
	});

	describe("exportKeyToString and importKeyFromString", () => {
		test("exports and imports key correctly", async () => {
			const originalKey = await generateMasterKey();
			const keyString = await exportKeyToString(originalKey);
			const importedKey = await importKeyFromString(keyString);

			// verify the imported key works the same as the original
			const testData = "test with exported/imported key";
			const encrypted = await encryptData(originalKey, testData);
			const decrypted = await decryptData(importedKey, encrypted);

			expect(decrypted).toBe(testData);
		});

		test("exported key is valid JSON", async () => {
			const key = await generateMasterKey();
			const keyString = await exportKeyToString(key);

			const parsed = JSON.parse(keyString);
			expect(parsed).toHaveProperty("kty");
			expect(parsed).toHaveProperty("k");
			expect(parsed).toHaveProperty("alg");
		});

		test("imported key has correct properties", async () => {
			const originalKey = await generateMasterKey();
			const keyString = await exportKeyToString(originalKey);
			const importedKey = await importKeyFromString(keyString);

			expect(importedKey).toBeInstanceOf(CryptoKey);
			expect(importedKey.algorithm.name).toBe("AES-GCM");
			expect(importedKey.extractable).toBe(true);
			expect(importedKey.usages).toContain("encrypt");
			expect(importedKey.usages).toContain("decrypt");
		});
	});

	describe("full encryption workflow", () => {
		test("complete user registration and note encryption flow", async () => {
			const userPassword = "MySecurePassword123!";
			const salt = generateSalt();

			const masterKey = await generateMasterKey();

			const kek = await deriveKeyFromPassword(userPassword, salt);

			const wrappedMasterKey = await wrapMasterKey(masterKey, kek);

			const noteContent = "This is my secret note content!";
			const encryptedNote = await encryptData(masterKey, noteContent);

			const loginKek = await deriveKeyFromPassword(userPassword, salt);

			const recoveredMasterKey = await unwrapMasterKey(
				wrappedMasterKey,
				loginKek,
			);

			const decryptedNote = await decryptData(
				recoveredMasterKey,
				encryptedNote,
			);

			expect(decryptedNote).toBe(noteContent);
		});

		test("password change flow", async () => {
			const oldPassword = "OldPassword123";
			const oldSalt = generateSalt();
			const masterKey = await generateMasterKey();
			const oldKek = await deriveKeyFromPassword(oldPassword, oldSalt);
			const wrappedWithOldPassword = await wrapMasterKey(masterKey, oldKek);

			const noteContent = "My important note";
			const encryptedNote = await encryptData(masterKey, noteContent);

			const newPassword = "NewPassword456";
			const newSalt = generateSalt();

			const recoveredMasterKey = await unwrapMasterKey(
				wrappedWithOldPassword,
				oldKek,
			);

			const newKek = await deriveKeyFromPassword(newPassword, newSalt);

			const wrappedWithNewPassword = await wrapMasterKey(
				recoveredMasterKey,
				newKek,
			);

			const oldKekAgain = await deriveKeyFromPassword(oldPassword, oldSalt);
			await expect(
				unwrapMasterKey(wrappedWithNewPassword, oldKekAgain),
			).rejects.toThrow();

			const newKekAgain = await deriveKeyFromPassword(newPassword, newSalt);
			const finalMasterKey = await unwrapMasterKey(
				wrappedWithNewPassword,
				newKekAgain,
			);
			const decryptedNote = await decryptData(finalMasterKey, encryptedNote);

			expect(decryptedNote).toBe(noteContent);
		});
	});
});
