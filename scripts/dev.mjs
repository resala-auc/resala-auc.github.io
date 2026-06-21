import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import "./build.mjs";

const root = "dist";
const port = Number(process.env.PORT || 4173);
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".json", "application/json; charset=utf-8"]
]);

const server = createServer(async (request, response) => {
  try {
    const requestedUrl = new URL(request.url || "/", `http://${request.headers.host}`);
    const decodedPath = decodeURIComponent(requestedUrl.pathname);
    const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, safePath === "/" ? "index.html" : safePath);
    const fileStat = await stat(filePath).catch(() => null);

    if (fileStat?.isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extname(filePath)) || "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Serving ${pathToFileURL(join(process.cwd(), root, "index.html")).href}`);
  console.log(`Local URL: http://localhost:${port}`);
});
