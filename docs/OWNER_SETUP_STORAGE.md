# Owner setup: private screenshot bucket (Supabase Storage) — about 5 minutes
Do this once, before the build session reaches the screenshots feature.

## A. Create the private bucket
1. Open https://supabase.com/dashboard and select the **TradeNotes project**, the one whose address appears in your Vercel `DATABASE_URL` (`db.<project-ref>.supabase.co`). If you have several projects, check the project reference matches.
2. Left sidebar -> **Storage** -> **New bucket**.
3. **Name:** `trade-screenshots` (exactly, lowercase, with the hyphen).
4. **Public bucket: leave it OFF.** This is what makes it private. If there is a toggle or checkbox for public, it must be unticked.
5. Open the bucket's advanced options (shown on the same form, or later via the bucket's three-dot menu -> Edit bucket) and set:
   - **Restrict file size:** on, **2 MB**.
   - **Allowed MIME types:** `image/png, image/jpeg, image/webp`.
6. Click **Create bucket** (or **Save**).
7. **Do not add any storage policies.** With none, no public or logged-in API user can read the bucket. The app reaches it only from the server with its secret key.

## B. Check it is private
Bucket list -> `trade-screenshots` should show a **Private** tag (no "Public" badge). Optional proof: upload any image, copy its URL and open it in a private window. It must show an error, not the image. Then delete the test file.

## C. Get the two values
1. Left sidebar -> **Project Settings** (gear) -> **API** (newer dashboards: **API Keys** and **Data API**).
2. **Project URL:** looks like `https://<project-ref>.supabase.co`. Copy it.
3. **Secret key:** use the **secret** key (starts `sb_secret_...`). On older dashboards use the **service_role** key instead. Do **not** use the publishable/anon key. Reveal and copy it. It is as powerful as database admin access to storage: never paste it in chat, email, GitHub or a screenshot.

## D. Add them to Vercel
Vercel -> project **tradenotes** -> Settings -> Environment Variables -> Add:
| Name | Value | Targets | Sensitive |
|---|---|---|---|
| `SUPABASE_URL` | the Project URL | Production and Preview | not needed |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret / service_role key | Production and Preview | **ON** |
(The variable is named `...SERVICE_ROLE_KEY` even if you paste an `sb_secret_` key.) Redeploy afterwards: variables only apply to new deployments.

## E. Tell the build session
Reply "bucket created, variables set" (no values). It will then build against the real bucket. Until then it uses an in-memory fake and the screenshot screen shows "not available yet".

## F. Later
Supabase dashboard -> Storage shows usage; the free allowance is about 1 GB (confirm in your plan). Rotate the key if it is ever exposed: Project Settings -> API Keys -> regenerate, then update Vercel and redeploy.
