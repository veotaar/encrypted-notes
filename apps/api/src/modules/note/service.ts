import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { status } from "elysia";
import type { NoteModel } from "./model";

export async function createNote(noteData: NoteModel.NoteInsert) {
	const [note] = await db.insert(table.note).values(noteData).returning();
	return note;
}

export async function updateNote({
	noteId,
	content,
	userId,
}: {
	noteId: string;
	content: string;
	userId: string;
}) {
	const [note] = await db
		.update(table.note)
		.set({ content })
		.where(
			and(
				eq(table.note.id, noteId),
				eq(table.note.userId, userId),
				isNull(table.note.deletedAt),
			),
		)
		.returning();

	if (!note) {
		throw status(404, "Note not found");
	}

	return note;
}

export async function getNotesByUserId({
	userId,
	limit = 50,
	cursor,
}: {
	userId: string;
	limit?: number;
	cursor: string;
}) {
	const applyCursor = cursor !== "initial";

	// Fetch limit + 1 to determine if there are more results
	const notes = await db
		.select({
			id: table.note.id,
			content: table.note.content,
			userId: table.note.userId,
			createdAt: table.note.createdAt,
			updatedAt: table.note.updatedAt,
			tags: sql<Array<{ id: string; content: string }>>`
				COALESCE(
					json_agg(
						json_build_object('id', ${table.tag.id}, 'content', ${table.tag.content})
					) FILTER (WHERE ${table.tag.id} IS NOT NULL),
					'[]'
				)
			`.as("tags"),
		})
		.from(table.note)
		.leftJoin(table.noteTag, eq(table.note.id, table.noteTag.noteId))
		.leftJoin(table.tag, eq(table.noteTag.tagId, table.tag.id))
		.where(
			and(
				eq(table.note.userId, userId),
				isNull(table.note.deletedAt),
				applyCursor ? lt(table.note.id, cursor) : undefined,
			),
		)
		.groupBy(
			table.note.id,
			table.note.content,
			table.note.userId,
			table.note.createdAt,
			table.note.updatedAt,
		)
		.orderBy(desc(table.note.id))
		.limit(limit + 1);

	const hasMore = notes.length > limit;
	const resultNotes = hasMore ? notes.slice(0, limit) : notes;
	const nextCursor = hasMore ? resultNotes[resultNotes.length - 1]?.id : null;

	return {
		notes: resultNotes,
		pagination: {
			hasMore,
			nextCursor,
		},
	};
}
