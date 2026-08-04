import { getUserIdFromRequest } from "../lib/session.js";
import { getAccessToken, writeDriveProperties } from "../lib/drive.js";

export async function handleTags(request, env) {
  const userId = await getUserIdFromRequest(request, env);
  if (!userId) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });

  if (request.method === "GET") {
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return new Response(JSON.stringify({ error: "fileId required" }), { status: 400 });
    const { results } = await env.DB.prepare("SELECT tag_key, tag_value FROM tags WHERE file_id = ?")
      .bind(fileId).all();
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "POST") {
    const { fileId, tagKey, tagValue } = await request.json();
    if (!fileId || !tagKey || !tagValue) {
      return new Response(JSON.stringify({ error: "fileId, tagKey, tagValue required" }), { status: 400 });
    }
    // Prefix manual tags to avoid collisions with auto-inferred layer tags, unless overwriting a known layer key
    await env.DB.prepare("INSERT INTO tags (file_id, tag_key, tag_value) VALUES (?, ?, ?)")
      .bind(fileId, tagKey, tagValue).run();

    // Best-effort sync back to Drive properties too
    try {
      const accessToken = await getAccessToken(userId, env);
      await writeDriveProperties(fileId, { [tagKey]: tagValue }, accessToken);
    } catch (e) {
      console.error("Failed to sync tag to Drive:", e);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "DELETE") {
    const { fileId, tagKey, tagValue } = await request.json();
    await env.DB.prepare("DELETE FROM tags WHERE file_id = ? AND tag_key = ? AND tag_value = ?")
      .bind(fileId, tagKey, tagValue).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
}
