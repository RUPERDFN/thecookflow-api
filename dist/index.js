import http from "node:http";
const PORT = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("TheCookFlow API");
});
server.listen(PORT, () => {
    console.log(`[api] listening on :${PORT}`);
});
