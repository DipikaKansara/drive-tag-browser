import { handleAuthStart, handleAuthCallback } from "./routes/auth.js";
import { handleScan } from "./routes/scan.js";
import { handleTags } from "./routes/tags.js";
import { handleFacets } from "./routes/facets.js";

function cors(resp, env) {
  resp.headers.set("Access-Control-Allow-Origin", env.FRONTEND_URL);
  resp.headers.set("Access-Control-Allow-Credentials", "true");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  resp.headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  return resp;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }), env);
    }

    try {
      let resp;
      if (url.pathname === "/auth/start") resp = await handleAuthStart(request, env);
      else if (url.pathname === "/auth/callback") resp = await handleAuthCallback(request, env);
      else if (url.pathname === "/api/scan") resp = await handleScan(request, env);
      else if (url.pathname.startsWith("/api/tags")) resp = await handleTags(request, env);
      else if (url.pathname === "/api/facets") resp = await handleFacets(request, env);
      else resp = new Response("Not found", { status: 404 });

      return cors(resp, env);
    } catch (err) {
      console.error(err);
      return cors(new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }), env);
    }
  },
};
