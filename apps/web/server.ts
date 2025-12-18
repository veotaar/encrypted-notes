const PORT = Number(process.env.PORT) || 3001;

const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);
		let pathname = url.pathname;

		if (pathname === "/") {
			pathname = "/index.html";
		}

		const filePath = `./dist${pathname}`;
		const file = Bun.file(filePath);

		if (await file.exists()) {
			return new Response(file, {
				headers: {
					"Content-Type": file.type,
					// Cache static assets
					...(pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)
						? { "Cache-Control": "public, max-age=31536000, immutable" }
						: {}),
				},
			});
		}

		// For SPA routing: serve index.html for non-file requests
		// This enables client-side routing with TanStack Router
		if (!pathname.includes(".")) {
			const indexFile = Bun.file("./dist/index.html");
			if (await indexFile.exists()) {
				return new Response(indexFile, {
					headers: {
						"Content-Type": "text/html",
					},
				});
			}
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.log(`🌐 Web server running at http://localhost:${server.port}`);
