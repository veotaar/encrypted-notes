import { relations } from "drizzle-orm";
import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { account } from "./account";
import { session } from "./session";

export const user = pgTable("user", {
	id: idField,
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	encryptionSalt: text("encryption_salt").notNull(),
	wrappedMasterKey: text("wrapped_master_key").notNull(),
	...timestamps,
});

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
}));
