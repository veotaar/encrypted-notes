import { argon2id } from "hash-wasm";

const ENCRYPTION_ALGO = "AES-GCM";

// Random Master Key - Data Encryption Key (DEK)
export async function generateMasterKey(): Promise<CryptoKey> {
	return window.crypto.subtle.generateKey(
		{
			name: ENCRYPTION_ALGO,
			length: 256,
		},
		true, // extractable
		["encrypt", "decrypt"],
	);
}

// Derive Key Encryption Key (KEK) from the Password
export async function deriveKeyFromPassword(
	password: string,
	saltHex: string,
): Promise<CryptoKey> {
	const salt = hexToBytes(saltHex);

	const derivedKeyBytes: Uint8Array = await argon2id({
		password: password,
		salt: salt,
		parallelism: 1,
		iterations: 2,
		memorySize: 64000, // 64 MB
		hashLength: 32,
		outputType: "binary",
	});

	// Import the Raw Bytes into WebCrypto to make a usable CryptoKey
	const normalizedBytes = new Uint8Array(derivedKeyBytes);
	return window.crypto.subtle.importKey(
		"raw",
		normalizedBytes,
		{ name: ENCRYPTION_ALGO },
		false, // not extractable (stays in memory)
		["encrypt", "decrypt", "wrapKey", "unwrapKey"],
	);
}

export async function encryptData(
	key: CryptoKey,
	data: string,
): Promise<string> {
	const enc = new TextEncoder();
	const iv = window.crypto.getRandomValues(new Uint8Array(12));

	const encrypted = await window.crypto.subtle.encrypt(
		{
			name: ENCRYPTION_ALGO,
			iv: iv,
		},
		key,
		enc.encode(data),
	);

	return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(encrypted))}`;
}

export async function decryptData(
	key: CryptoKey,
	encryptedPayload: string,
): Promise<string> {
	const [ivHex, cipherHex] = encryptedPayload.split(":");
	if (!ivHex || !cipherHex) {
		throw new Error("Invalid encrypted payload format");
	}
	const iv = new Uint8Array(hexToBytes(ivHex));
	const cipher = new Uint8Array(hexToBytes(cipherHex));

	const decrypted = await window.crypto.subtle.decrypt(
		{
			name: ENCRYPTION_ALGO,
			iv: iv,
		},
		key,
		cipher,
	);

	const dec = new TextDecoder();
	return dec.decode(decrypted);
}

// Wrap the master key using the KEK derived from password
export async function wrapMasterKey(
	masterKey: CryptoKey,
	kek: CryptoKey,
): Promise<string> {
	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const wrapped = await window.crypto.subtle.wrapKey("jwk", masterKey, kek, {
		name: ENCRYPTION_ALGO,
		iv: iv,
	});
	return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(wrapped))}`;
}

// Unwrap the master key using the KEK derived from password
export async function unwrapMasterKey(
	wrappedKeyPayload: string,
	kek: CryptoKey,
): Promise<CryptoKey> {
	const [ivHex, wrappedHex] = wrappedKeyPayload.split(":");
	if (!ivHex || !wrappedHex) {
		throw new Error("Invalid wrapped key payload format");
	}
	const iv = new Uint8Array(hexToBytes(ivHex));
	const wrappedKey = new Uint8Array(hexToBytes(wrappedHex));

	return window.crypto.subtle.unwrapKey(
		"jwk",
		wrappedKey,
		kek,
		{
			name: ENCRYPTION_ALGO,
			iv: iv,
		},
		{ name: ENCRYPTION_ALGO },
		true, // extractable
		["encrypt", "decrypt"],
	);
}

// Helpers
export async function exportKeyToString(key: CryptoKey): Promise<string> {
	const exported = await window.crypto.subtle.exportKey("jwk", key);
	return JSON.stringify(exported);
}

export async function importKeyFromString(
	keyString: string,
): Promise<CryptoKey> {
	const jwk = JSON.parse(keyString);
	return window.crypto.subtle.importKey(
		"jwk",
		jwk,
		{ name: ENCRYPTION_ALGO },
		true,
		["encrypt", "decrypt"],
	);
}

export function generateSalt(): string {
	const salt = window.crypto.getRandomValues(new Uint8Array(16));
	return bytesToHex(salt);
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function hexToBytes(hex: string): Uint8Array {
	const matches = hex.match(/.{1,2}/g);
	if (!matches) {
		throw new Error("Invalid hex string");
	}
	return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
}
