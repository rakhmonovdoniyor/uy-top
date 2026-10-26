const fs = require("fs");
const http = require("http");
const path = require("path");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const BUILD_DIR = path.resolve(__dirname, "..", "build");
const INDEX_HTML = path.join(BUILD_DIR, "index.html");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify({ error: "Fayl topilmadi." }));
      return;
    }

    res.writeHead(200, {
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=31536000",
      "Content-Type": contentType,
    });
    res.end(content);
  });
}

if (!fs.existsSync(INDEX_HTML)) {
  console.error("build/index.html topilmadi. Avval npm run build yurgizing.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const requestedFile = path.resolve(BUILD_DIR, `.${requestPath}`);

  if (!requestedFile.startsWith(BUILD_DIR)) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Fayl yo'li noto'g'ri." }));
    return;
  }

  if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
    sendFile(res, requestedFile);
    return;
  }

  sendFile(res, INDEX_HTML);
});

server.listen(PORT, HOST, () => {
  console.log(`UyTop preview: http://${HOST}:${PORT}`);
});
