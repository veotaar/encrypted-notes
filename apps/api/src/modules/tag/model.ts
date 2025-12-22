import { table } from "@api/db/model";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

export namespace TagModel {
	export const tag = {
		insert: createInsertSchema(table.tag).omit({
			id: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		}),
		select: createSelectSchema(table.tag),
		update: createUpdateSchema(table.tag).omit({
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		}),
	};

	export type TagInsert = z.infer<typeof tag.insert>;
	export type TagSelect = z.infer<typeof tag.select>;
	export type TagUpdate = z.infer<typeof tag.update>;
}
