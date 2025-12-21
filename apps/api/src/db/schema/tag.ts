import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { noteTag } from "./noteTag";
import { user } from "./user";

export const tag = pgTable(
	"tag",
	{
		id: idField,
		content: text("content").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => [
		index("tag_userId_idx").on(table.userId),
		index("tag_deletedAt_idx").on(table.deletedAt),
	],
);

export const tagRelations = relations(tag, ({ one, many }) => ({
	user: one(user, {
		fields: [tag.userId],
		references: [user.id],
	}),
	noteTags: many(noteTag),
}));
