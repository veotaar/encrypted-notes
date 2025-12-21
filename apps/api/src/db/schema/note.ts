import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { noteTag } from "./noteTag";
import { user } from "./user";

export const note = pgTable(
	"note",
	{
		id: idField,
		content: text("content").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => [
		index("note_userId_idx").on(table.userId),
		index("note_deletedAt_idx").on(table.deletedAt),
	],
);

export const noteRelations = relations(note, ({ one, many }) => ({
	user: one(user, {
		fields: [note.userId],
		references: [user.id],
	}),
	noteTags: many(noteTag),
}));
