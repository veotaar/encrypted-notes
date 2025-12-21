import { account } from "./schema/account";
import { note } from "./schema/note";
import { noteTag } from "./schema/noteTag";
import { session } from "./schema/session";
import { tag } from "./schema/tag";
import { user } from "./schema/user";
import { verification } from "./schema/verification";

// table singleton
export const table = {
	user,
	account,
	session,
	verification,
	note,
	tag,
	noteTag,
} as const;

export type Table = typeof table;
