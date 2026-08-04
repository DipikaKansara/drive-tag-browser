const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";

async function request(path, options = {}) {
  const resp = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
  return resp.json();
}

export function loginUrl() {
  return `${WORKER_URL}/auth/start`;
}

export function scanFolder(rootFolderId, layerLabels) {
  return request("/api/scan", {
    method: "POST",
    body: JSON.stringify({ rootFolderId, layerLabels }),
  });
}

export function getFacets(filters) {
  const params = new URLSearchParams(filters);
  return request(`/api/facets?${params.toString()}`);
}

export function addTag(fileId, tagKey, tagValue) {
  return request("/api/tags", {
    method: "POST",
    body: JSON.stringify({ fileId, tagKey, tagValue }),
  });
}

export function removeTag(fileId, tagKey, tagValue) {
  return request("/api/tags", {
    method: "DELETE",
    body: JSON.stringify({ fileId, tagKey, tagValue }),
  });
}
