import { createFileRoute, redirect } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { LoginForm } from "@web/components/login-form";
import { z } from "zod";

const loginSearchSchema = z.object({
	redirect: fallback(z.url(), "/").default("/"),
});

export const Route = createFileRoute("/login")({
	validateSearch: zodValidator(loginSearchSchema),
	beforeLoad: ({ search, context: { auth } }) => {
		if (auth.isAuthenticated) {
			throw redirect({ to: search.redirect });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
		</div>
	);
}
