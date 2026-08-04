import { decryptToken } from "./crypto.js";

export async function getAccessToken(userId, env) {
  const row = await env.DB.prepare("SELECT refresh_token FROM users WHERE id = ?").bind(userId).first();
  if (!row) throw new Error("User not found");
  const refreshToken = await decryptToken(row.refresh_token, env);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("Failed to refresh access token: " + JSON.stringify(data));
  return data.access_token;
}

// Recursively walk a Drive folder tree starting at rootFolderId.
// Returns a flat array of { id, name, mimeType, webViewLink, pathSegments: [] }
export async function walkFolder(rootFolderId, accessToken, pathSegments = []) {
  const results = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({
      q: `'${rootFolderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink)",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json();
    if (data.error) throw new Error(JSON.stringify(data.error));

    for (const file of data.files || []) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        const nested = await walkFolder(file.id, accessToken, [...pathSegments, file.name]);
        results.push(...nested);
      } else {
        results.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          pathSegments: [...pathSegments], // folders above this file, NOT including file name
        });
      }
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return results;
}

// Write tags back to the file as Drive custom properties (source of truth).
export async function writeDriveProperties(fileId, properties, accessToken) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });
}
