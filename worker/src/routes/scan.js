import { getUserIdFromRequest } from "../lib/session.js";
import { getAccessToken, walkFolder, writeDriveProperties } from "../lib/drive.js";

// Default layer labels for path depth: layer 0 = client, 1 = task, 2 = year.
// Caller can override via body.layerLabels, e.g. ["client","task","year"].
const DEFAULT_LAYERS = ["client", "task", "year"];

export async function handleScan(request, env) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const userId = await getUserIdFromRequest(request, env);
  if (!userId) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });

  const body = await request.json();
  const { rootFolderId, layerLabels = DEFAULT_LAYERS } = body;
  if (!rootFolderId) return new Response(JSON.stringify({ error: "rootFolderId required" }), { status: 400 });

  const accessToken = await getAccessToken(userId, env);
  const files = await walkFolder(rootFolderId, accessToken);

  let count = 0;
  for (const file of files) {
    const tagPairs = {};
    file.pathSegments.forEach((segment, i) => {
      const key = layerLabels[i] || `layer${i}`;
      tagPairs[key] = segment;
    });

    // Upsert file row
    await env.DB.prepare(
      `INSERT INTO files (id, user_id, name, mime_type, web_view_link, parent_path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, mime_type=excluded.mime_type,
         web_view_link=excluded.web_view_link, parent_path=excluded.parent_path, last_synced=datetime('now')`
    ).bind(file.id, userId, file.name, file.mimeType, file.webViewLink, file.pathSegments.join(" > ")).run();

    // Replace tags for this file with freshly inferred ones (manual tags added separately won't be touched
    // if you use a distinct tag_key namespace, e.g. prefix custom tags with "custom:")
    await env.DB.prepare("DELETE FROM tags WHERE file_id = ? AND tag_key IN (" +
      layerLabels.map(() => "?").join(",") + ")").bind(file.id, ...layerLabels).run();

    for (const [key, value] of Object.entries(tagPairs)) {
      await env.DB.prepare("INSERT INTO tags (file_id, tag_key, tag_value) VALUES (?, ?, ?)")
        .bind(file.id, key, value).run();
    }

    // Write back to Drive as the source of truth
    await writeDriveProperties(file.id, tagPairs, accessToken);
    count++;
  }

  return new Response(JSON.stringify({ scanned: count }), {
    headers: { "Content-Type": "application/json" },
  });
}
