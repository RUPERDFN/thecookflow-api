import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { logger } from "./lib/logger.js";

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

type Route = {
  method: string;
  path: string;
  handler: RequestHandler;
};

const routes: Route[] = [];

const json = (res: ServerResponse, statusCode: number, data: unknown) => {
  const body = JSON.stringify(data);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
};

const addRoute = (method: string, path: string, handler: RequestHandler) => {
  routes.push({ method: method.toUpperCase(), path, handler });
};

const parseBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const payload = Buffer.concat(chunks).toString("utf-8");

  try {
    return JSON.parse(payload);
  } catch (error) {
    logger.warn({ error }, "Failed to parse JSON body");
    return undefined;
  }
};

const handleCors = (res: ServerResponse) => {
  const origin = process.env.CORS_ORIGIN ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
};

addRoute("GET", "/api/health", (_req, res) => {
  json(res, 200, {
    ok: true,
    service: "api",
    ts: new Date().toISOString()
  });
});

addRoute("POST", "/api/chef", async (req, res) => {
  const body = await parseBody(req);
  const prompt = typeof body === "object" && body !== null ? (body as any).prompt : undefined;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return json(res, 400, { error: "Invalid prompt provided" });
  }

  json(res, 200, { reply: "stub" });
});

addRoute("GET", "/api/subscription-status", (req, res) => {
  const url = new URL(req.url ?? "", "http://localhost");
  const userId = url.searchParams.get("userId");

  if (typeof userId !== "string" || userId.length === 0) {
    return json(res, 400, { error: "userId query parameter is required" });
  }

  const isPremium = userId.length % 2 === 0;
  json(res, 200, {
    status: isPremium ? "premium" : "free",
    until: isPremium ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null
  });
});

export const createApp = (): RequestHandler => {
  return async (req, res) => {
    if (!req.url) {
      handleCors(res);
      return json(res, 400, { error: "Malformed request" });
    }

    handleCors(res);

    if (req.method?.toUpperCase() === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }

    const url = new URL(req.url, "http://localhost");
    const route = routes.find((candidate) => candidate.method === (req.method ?? "").toUpperCase() && candidate.path === url.pathname);

    logger.info({ method: req.method, path: url.pathname }, "Incoming request");

    if (!route) {
      return json(res, 404, { error: "Not Found", path: url.pathname });
    }

    try {
      await route.handler(req, res);
    } catch (error) {
      logger.error({ error }, "Unhandled error");
      json(res, 500, { error: "Internal Server Error" });
    }
  };
};
