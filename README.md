# Drive Tag Browser

Tag files in Google Drive with arbitrary metadata (client, task, year, custom tags)
and browse them via any facet combination, independent of the physical folder structure.

## 1. Google Cloud setup
1. Create a project at console.cloud.google.com
2. Enable the **Google Drive API**
3. OAuth consent screen → External → add scope `https://www.googleapis.com/auth/drive`
4. Create OAuth client ID (Web application). Leave redirect URI blank for now — set it after deploying the Worker.
5. Note the **Client ID** and **Client Secret**.

## 2. Cloudflare setup
```
npm install -g wrangler
wrangler login
cd worker
wrangler d1 create drive-tag-browser-db
```
Copy the returned `database_id` into `worker/wrangler.toml`.

Apply the schema:
```
wrangler d1 execute drive-tag-browser-db --file=./schema.sql --remote
```

Generate a 32-byte hex encryption key (used for encrypting refresh tokens + signing sessions):
```
openssl rand -hex 32
```

Set secrets:
```
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY
```

Deploy:
```
wrangler deploy
```

This prints your Worker URL, e.g. `https://drive-tag-browser.yoursubdomain.workers.dev`.
Update `wrangler.toml`'s `GOOGLE_REDIRECT_URI` to `<that URL>/auth/callback`, redeploy,
and add that same URL as an authorized redirect URI in the Google Cloud OAuth client.

## 3. Frontend setup
```
cd frontend
npm install
echo "VITE_WORKER_URL=https://drive-tag-browser.yoursubdomain.workers.dev" > .env
npm run dev
```
Update `wrangler.toml`'s `FRONTEND_URL` to match wherever the frontend is hosted
(http://localhost:5173 for local dev, or your Cloudflare Pages URL once deployed).

## 4. Using it
1. Click "Log in with Google" — first time, Google will show a warning since the app
   is unverified/in testing mode. Add your own email as a test user in the OAuth
   consent screen config to authorize yourself.
2. Get a Drive folder ID (from the folder's URL: `drive.google.com/drive/folders/<THIS_PART>`)
   — this should be the folder containing your client-level subfolders.
3. Paste it in and click "Scan folder". This walks client > task > year and tags
   every file accordingly, both in D1 and as Drive file properties.
4. Use the facet picker to filter by any combination — client first, year first,
   task first, whatever order you click.

## Notes / next steps
- Manual custom tags: POST to `/api/tags` with `{fileId, tagKey, tagValue}` —
  wire up a small "add tag" UI in FileList.jsx next.
- Currently assumes a 3-layer folder structure. If different clients have different
  depths, the scan still works — it just tags however many layers exist per file.
- OneDrive support: same D1 schema, swap `lib/drive.js` for a Graph API equivalent.