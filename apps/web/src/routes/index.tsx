import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<Button variant="default">Hello, Encrypted Notes!</Button>
		</div>
	);
}
