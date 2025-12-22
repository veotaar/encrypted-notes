import { Elysia, status } from "elysia";
import { z } from "zod";
import { betterAuth } from "../auth";
import { TagModel } from "./model";
import {
	addTagToNote,
	createTag,
	deleteTag,
	removeTagFromNote,
} from "./service";

export const tagRoutes = new Elysia()
	.use(betterAuth)
	.guard({
		auth: true,
	})
	.post(
		"/tags",
		async ({ user, body }) => {
			if (user.id !== body.userId) {
				return status(403, "Forbidden");
			}

			const newTag = await createTag({
				content: body.content,
				userId: user.id,
			});

			return newTag;
		},
		{
			body: TagModel.tag.insert,
		},
	)
	.post(
		"/notes/:noteid/tags",
		async ({ user, params: { noteid }, body }) => {
			const noteTag = await addTagToNote({
				noteId: noteid,
				tagId: body.tagId,
				userId: user.id,
			});

			return noteTag;
		},
		{
			params: z.object({
				noteid: z.string(),
			}),
			body: z.object({
				tagId: z.string(),
			}),
		},
	)
	.delete(
		"/tags/:tagid",
		async ({ user, params: { tagid } }) => {
			await deleteTag({
				tagId: tagid,
				userId: user.id,
			});

			return { success: true };
		},
		{
			params: z.object({
				tagid: z.string(),
			}),
		},
	)
	.delete(
		"/notes/:noteid/tags/:tagid",
		async ({ user, params: { noteid, tagid } }) => {
			await removeTagFromNote({
				noteId: noteid,
				tagId: tagid,
				userId: user.id,
			});

			return { success: true };
		},
		{
			params: z.object({
				noteid: z.string(),
				tagid: z.string(),
			}),
		},
	);
