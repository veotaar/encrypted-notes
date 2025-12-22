import { table } from "@api/db/model";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

export namespace NoteModel {
	export const note = {
		insert: createInsertSchema(table.note).omit({
			id: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		}),
		select: createSelectSchema(table.note),
		update: createUpdateSchema(table.note).omit({
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		}),
	};

	export type NoteInsert = z.infer<typeof note.insert>;
	export type NoteSelect = z.infer<typeof note.select>;
	export type NoteUpdate = z.infer<typeof note.update>;
}
