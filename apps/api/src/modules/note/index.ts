import { Elysia, status } from "elysia";
import { z } from "zod";
import { betterAuth } from "../auth";
import { NoteModel } from "./model";
import { createNote, getNotesByUserId, updateNote } from "./service";

export const noteRoutes = new Elysia()
	.use(betterAuth)
	.guard({
		auth: true,
	})
	.get(
		"/notes",
		async ({ user, query: { cursor, limit } }) => {
			const notes = await getNotesByUserId({ userId: user.id, cursor, limit });
			return notes;
		},
		{
			query: z.object({
				cursor: z.string().default("initial"),
				limit: z.coerce.number().min(1).max(100).default(50),
			}),
		},
	)
	.post(
		"/notes",
		async ({ user, body }) => {
			if (user.id !== body.userId) {
				return status(403, "Forbidden");
			}

			const newNote = await createNote({
				content: body.content,
				userId: user.id,
			});

			if (!newNote) {
				return status(500, "Failed to create note");
			}

			return newNote;
		},
		{
			body: NoteModel.note.insert,
		},
	)
	.patch(
		"/notes/:noteid",
		async ({ user, params, body }) => {
			const noteId = params.noteid;

			const updatedNote = await updateNote({
				noteId,
				content: body.content,
				userId: user.id,
			});

			return updatedNote;
		},
		{
			params: z.object({
				noteid: z.string(),
			}),
			body: z.object({
				content: z.string().min(1),
			}),
		},
	);
