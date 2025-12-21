import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { timestamps } from "../helpers";
import { note } from "./note";
import { tag } from "./tag";

export const noteTag = pgTable(
	"note_tag",
	{
		noteId: text("note_id")
			.notNull()
			.references(() => note.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tag.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => [
		primaryKey({ columns: [table.noteId, table.tagId] }),
		index("noteTag_deletedAt_idx").on(table.deletedAt),
	],
);

export const noteTagRelations = relations(noteTag, ({ one }) => ({
	note: one(note, {
		fields: [noteTag.noteId],
		references: [note.id],
	}),
	tag: one(tag, {
		fields: [noteTag.tagId],
		references: [tag.id],
	}),
}));
