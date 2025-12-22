import { Elysia, status } from "elysia";
import { z } from "zod";
import { betterAuth } from "../auth";
import { NoteModel } from "./model";
import {
	createNote,
	deleteNote,
	getNoteById,
	getNotesByUserId,
	updateNote,
} from "./service";

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
	.get(
		"/notes/:noteid",
		async ({ user, params: { noteid } }) => {
			const note = await getNoteById({ noteId: noteid, userId: user.id });
			return note;
		},
		{
			params: z.object({
				noteid: z.string(),
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

			return newNote;
		},
		{
			body: NoteModel.note.insert,
		},
	)
	.patch(
		"/notes/:noteid",
		async ({ user, params: { noteid }, body }) => {
			const updatedNote = await updateNote({
				noteId: noteid,
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
	)
	.delete(
		"/notes/:noteid",
		async ({ user, params: { noteid } }) => {
			await deleteNote({
				noteId: noteid,
				userId: user.id,
			});

			return status("No Content");
		},
		{
			params: z.object({
				noteid: z.string(),
			}),
		},
	);
