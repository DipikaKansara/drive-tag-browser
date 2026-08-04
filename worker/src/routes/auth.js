import { encryptToken } from "../lib/crypto.js";
import { createSessionCookie } from "../lib/session.js";

const SCOPE = "https://www.googleapis.com/auth/drive email profile";

export async function handleAuthStart(request, env) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // ensures we always get a refresh_token
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(authUrl, 302);
}

export async function handleAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  // Exchange code for tokens
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenResp.json();
  if (!tokens.refresh_token && !tokens.access_token) {
    return new Response(JSON.stringify(tokens), { status: 400 });
  }

  // Get user profile
  const profileResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileResp.json();

  // Store or update user
  const existing = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(profile.id).first();
  if (tokens.refresh_token) {
    const encrypted = await encryptToken(tokens.refresh_token, env);
    if (existing) {
      await env.DB.prepare("UPDATE users SET refresh_token = ?, email = ? WHERE id = ?")
        .bind(encrypted, profile.email, profile.id).run();
    } else {
      await env.DB.prepare("INSERT INTO users (id, email, refresh_token) VALUES (?, ?, ?)")
        .bind(profile.id, profile.email, encrypted).run();
    }
  } else if (!existing) {
    // Shouldn't normally happen since prompt=consent forces refresh_token on first auth
    return new Response("No refresh token received. Revoke app access in your Google account and try again.", { status: 400 });
  }

  const cookie = await createSessionCookie(profile.id, env);
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": cookie,
      Location: env.FRONTEND_URL,
    },
  });
}
