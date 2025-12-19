import * as React from "react";
import { exportKeyToString, importKeyFromString } from "./crypto";

const MASTER_KEY_STORAGE_KEY = "encrypted_notes_master_key";

export interface CryptoContextType {
	masterKey: CryptoKey | null;
	isReady: boolean;
	setMasterKey: (key: CryptoKey) => Promise<void>;
	clearMasterKey: () => void;
}

const CryptoContext = React.createContext<CryptoContextType | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
	const [masterKey, setMasterKeyState] = React.useState<CryptoKey | null>(null);
	const [isReady, setIsReady] = React.useState(false);

	// On mount, attempt to restore master key from localStorage
	React.useEffect(() => {
		const loadStoredKey = async () => {
			try {
				const storedKey = localStorage.getItem(MASTER_KEY_STORAGE_KEY);
				if (storedKey) {
					const key = await importKeyFromString(storedKey);
					setMasterKeyState(key);
				}
			} catch (error) {
				// Invalid or corrupted key in storage, clear it
				console.error("Failed to restore master key from storage:", error);
				localStorage.removeItem(MASTER_KEY_STORAGE_KEY);
			} finally {
				setIsReady(true);
			}
		};

		loadStoredKey();
	}, []);

	const setMasterKey = React.useCallback(async (key: CryptoKey) => {
		try {
			const keyString = await exportKeyToString(key);
			localStorage.setItem(MASTER_KEY_STORAGE_KEY, keyString);
			setMasterKeyState(key);
		} catch (error) {
			console.error("Failed to store master key:", error);
			throw error;
		}
	}, []);

	const clearMasterKey = React.useCallback(() => {
		localStorage.removeItem(MASTER_KEY_STORAGE_KEY);
		setMasterKeyState(null);
	}, []);

	const contextValue = React.useMemo(
		() => ({
			masterKey,
			isReady,
			setMasterKey,
			clearMasterKey,
		}),
		[masterKey, isReady, setMasterKey, clearMasterKey],
	);

	return <CryptoContext value={contextValue}>{children}</CryptoContext>;
}

export function useCrypto() {
	const context = React.useContext(CryptoContext);

	if (!context) {
		throw new Error("useCrypto must be used within a CryptoProvider");
	}

	return context;
}
