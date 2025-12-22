import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, eq, isNull, sql } from "drizzle-orm";
import { status } from "elysia";
import type { TagModel } from "./model";

export async function createTag(tagData: TagModel.TagInsert) {
	const [tag] = await db.insert(table.tag).values(tagData).returning();

	if (!tag) {
		throw status(500, "Failed to create tag");
	}

	return tag;
}

export async function deleteTag({
	tagId,
	userId,
}: {
	tagId: string;
	userId: string;
}) {
	const [deleted] = await db
		.update(table.tag)
		.set({ deletedAt: sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')` })
		.where(
			and(
				eq(table.tag.id, tagId),
				eq(table.tag.userId, userId),
				isNull(table.tag.deletedAt),
			),
		)
		.returning();

	if (!deleted) {
		throw status(404, "Tag not found");
	}

	return deleted;
}

export async function addTagToNote({
	noteId,
	tagId,
	userId,
}: {
	noteId: string;
	tagId: string;
	userId: string;
}) {
	// Verify note exists and belongs to user
	const [note] = await db
		.select({ id: table.note.id })
		.from(table.note)
		.where(
			and(
				eq(table.note.id, noteId),
				eq(table.note.userId, userId),
				isNull(table.note.deletedAt),
			),
		);

	if (!note) {
		throw status(404, "Note not found");
	}

	// Verify tag exists and belongs to user
	const [tag] = await db
		.select({ id: table.tag.id })
		.from(table.tag)
		.where(
			and(
				eq(table.tag.id, tagId),
				eq(table.tag.userId, userId),
				isNull(table.tag.deletedAt),
			),
		);

	if (!tag) {
		throw status(404, "Tag not found");
	}

	const [existingNoteTag] = await db
		.select()
		.from(table.noteTag)
		.where(
			and(eq(table.noteTag.noteId, noteId), eq(table.noteTag.tagId, tagId)),
		);

	if (existingNoteTag && !existingNoteTag.deletedAt) {
		throw status(409, "Tag already added to note");
	}

	// If soft-deleted, restore it
	if (existingNoteTag?.deletedAt) {
		const [restored] = await db
			.update(table.noteTag)
			.set({ deletedAt: null })
			.where(
				and(eq(table.noteTag.noteId, noteId), eq(table.noteTag.tagId, tagId)),
			)
			.returning();

		return restored;
	}

	const countResult = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(table.noteTag)
		.where(
			and(eq(table.noteTag.noteId, noteId), isNull(table.noteTag.deletedAt)),
		);

	const count = countResult[0]?.count ?? 0;

	if (count >= 50) {
		throw status(400, "Note cannot have more than 50 tags");
	}

	// Create new noteTag
	const [noteTag] = await db
		.insert(table.noteTag)
		.values({
			noteId,
			tagId,
		})
		.returning();

	if (!noteTag) {
		throw status(500, "Failed to add tag to note");
	}

	return noteTag;
}

export async function removeTagFromNote({
	noteId,
	tagId,
	userId,
}: {
	noteId: string;
	tagId: string;
	userId: string;
}) {
	// Verify note exists and belongs to user
	const [note] = await db
		.select({ id: table.note.id })
		.from(table.note)
		.where(
			and(
				eq(table.note.id, noteId),
				eq(table.note.userId, userId),
				isNull(table.note.deletedAt),
			),
		);

	if (!note) {
		throw status(404, "Note not found");
	}

	// Soft delete the noteTag
	const [deleted] = await db
		.update(table.noteTag)
		.set({ deletedAt: sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')` })
		.where(
			and(
				eq(table.noteTag.noteId, noteId),
				eq(table.noteTag.tagId, tagId),
				isNull(table.noteTag.deletedAt),
			),
		)
		.returning();

	if (!deleted) {
		throw status(404, "Tag not found on note");
	}

	return deleted;
}
