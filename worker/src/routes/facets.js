import { getUserIdFromRequest } from "../lib/session.js";

// GET /api/facets?client=Acme&year=2025
// Returns: { files: [...], availableFacets: { task: ["Invoicing","Design"], year: [...], client: [...] } }
export async function handleFacets(request, env) {
  const userId = await getUserIdFromRequest(request, env);
  if (!userId) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });

  const url = new URL(request.url);
  const filters = [...url.searchParams.entries()]; // [["client","Acme"], ["year","2025"]]

  let fileIds;
  if (filters.length === 0) {
    const { results } = await env.DB.prepare("SELECT id FROM files WHERE user_id = ?").bind(userId).all();
    fileIds = results.map((r) => r.id);
  } else {
    // Intersect file ids matching each filter
    let candidateIds = null;
    for (const [key, value] of filters) {
      const { results } = await env.DB.prepare(
        `SELECT t.file_id FROM tags t JOIN files f ON f.id = t.file_id
         WHERE f.user_id = ? AND t.tag_key = ? AND t.tag_value = ?`
      ).bind(userId, key, value).all();
      const ids = new Set(results.map((r) => r.file_id));
      candidateIds = candidateIds === null ? ids : new Set([...candidateIds].filter((id) => ids.has(id)));
    }
    fileIds = [...(candidateIds || [])];
  }

  if (fileIds.length === 0) {
    return new Response(JSON.stringify({ files: [], availableFacets: {} }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const placeholders = fileIds.map(() => "?").join(",");
  const { results: files } = await env.DB.prepare(
    `SELECT id, name, mime_type, web_view_link, parent_path FROM files WHERE id IN (${placeholders})`
  ).bind(...fileIds).all();

  const { results: tagRows } = await env.DB.prepare(
    `SELECT file_id, tag_key, tag_value FROM tags WHERE file_id IN (${placeholders})`
  ).bind(...fileIds).all();

  // Attach tags to each file, and build availableFacets (tag_key -> distinct values among current result set)
  const tagsByFile = {};
  const availableFacets = {};
  for (const row of tagRows) {
    (tagsByFile[row.file_id] ||= []).push({ key: row.tag_key, value: row.tag_value });
    (availableFacets[row.tag_key] ||= new Set()).add(row.tag_value);
  }
  for (const key of Object.keys(availableFacets)) {
    availableFacets[key] = [...availableFacets[key]].sort();
  }

  const filesWithTags = files.map((f) => ({ ...f, tags: tagsByFile[f.id] || [] }));

  return new Response(JSON.stringify({ files: filesWithTags, availableFacets }), {
    headers: { "Content-Type": "application/json" },
  });
}
