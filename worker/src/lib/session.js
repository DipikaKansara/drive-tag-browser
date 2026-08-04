// Minimal signed session cookie (HMAC-SHA256) so we don't need a sessions table.
// Cookie value = base64(userId).base64(signature)

async function hmac(env) {
  const keyBytes = new TextEncoder().encode(env.TOKEN_ENCRYPTION_KEY);
  return crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSessionCookie(userId, env) {
  const key = await hmac(env);
  const payload = new TextEncoder().encode(userId);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
  const value = `${b64url(payload)}.${b64url(sig)}`;
  return `session=${value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000`;
}

export async function getUserIdFromRequest(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  const [payloadB64, sigB64] = match[1].split(".");
  if (!payloadB64 || !sigB64) return null;

  const payload = Uint8Array.from(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const sig = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

  const key = await hmac(env);
  const valid = await crypto.subtle.verify("HMAC", key, sig, payload);
  if (!valid) return null;

  return new TextDecoder().decode(payload);
}
