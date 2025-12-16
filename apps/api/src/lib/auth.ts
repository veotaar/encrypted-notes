import { db } from "@api/db/db";
import { table } from "@api/db/model";
import env from "@api/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, openAPI } from "better-auth/plugins";

export const auth = betterAuth({
	appName: "Encrypted Notes",
	basePath: "/api/auth",
	trustedOrigins: ["http://localhost:3000", "http://localhost:3001"],
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: table.user,
			account: table.account,
			session: table.session,
			verification: table.verification,
		},
	}),
	rateLimit: {
		enabled: env.NODE_ENV !== "development",
		customRules: {
			"/get-session": false,
			"/sign-in/anonymous": async () => {
				return {
					window: 3600, // seconds (1 hour)
					max: 4, // max 4 request per window per IP
				};
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		password: {
			hash: (password) =>
				Bun.password.hash(password, {
					algorithm: "argon2id",
					timeCost: 3,
				}),
			verify: ({ hash, password }) => Bun.password.verify(password, hash),
		},
	},
	user: {
		additionalFields: {
			encryptionSalt: { type: "string", required: true },
			wrappedMasterKey: { type: "string", required: true },
		},
	},
	advanced: {
		database: {
			generateId: false,
		},
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			partitioned: true,
		},
	},
	plugins: [admin(), openAPI(), anonymous()],
});
