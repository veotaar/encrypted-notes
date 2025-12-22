import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import { Spinner } from "@web/components/ui/spinner";
import { signOut } from "@web/lib/auth-client";
import { useCrypto } from "@web/lib/crypto-context";
import { cn } from "@web/lib/utils";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	// Temporary index route component with sign-out button
	// will be replaced with actual home page later
	const { auth } = Route.useRouteContext();
	const { clearMasterKey } = useCrypto();
	const navigate = useNavigate();

	const signOutMutation = useMutation({
		mutationFn: async () => {
			const { error } = await signOut();
			if (error) throw error;
		},
		onSuccess: async () => {
			await navigate({ to: "/login", search: { redirect: "/" } });
			clearMasterKey();
		},
	});

	if (auth.isPending) {
		return <div>Loading...</div>;
	}

	if (!auth.isAuthenticated) {
		return (
			<div>
				<Link to="/login">Login</Link> | <Link to="/signup">Sign Up</Link>
			</div>
		);
	}

	return (
		<div>
			<Button
				onClick={() => signOutMutation.mutateAsync()}
				className={cn(
					"hover:cursor-pointer hover:bg-primary/80",
					signOutMutation.isPending && "cursor-not-allowed",
				)}
				disabled={signOutMutation.isPending}
			>
				{signOutMutation.isPending ? <Spinner /> : "Sign Out"}
			</Button>
		</div>
	);
}
