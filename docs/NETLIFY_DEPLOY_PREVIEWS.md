# Netlify Deploy Previews

Deploy Previews give you a **unique URL per pull request** so you can test changes before merging. On the Free plan they cost **0 credits** (production deploys cost 15 credits each).

This repo includes [`netlify.toml`](../netlify.toml) so Netlify knows how to build the Vite app and route React Router paths (`/inventory`, `/reports`, `/users`).

---

## 1. Connect GitHub to Netlify (one-time)

Use **one Netlify site** for previews + staging (recommended). Add a second site later for production only.

1. Log in to [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Choose **GitHub** and authorize Netlify
3. Select this repository (`Mini Step POS` / your fork)
4. Netlify should detect settings from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. **Do not deploy yet** — set environment variables first (step 2)
6. Click **Deploy site**

### Site naming

- Staging + previews site: e.g. `mini-step-pos-staging`
- Production site (later): e.g. `mini-step-pos` with production branch `main`

---

## 2. Environment variables (required)

Vite embeds `VITE_*` variables at **build time**. Set them in:

**Site configuration → Environment variables → Add a variable**

### Staging site (previews + `staging` branch)

| Variable | Scope | Value |
|----------|--------|--------|
| `VITE_SUPABASE_URL` | **Deploy Previews** + **Branch deploys** + **Production** (for this site) | Staging Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Same scopes | Staging anon key |
| `VITE_SUPABASE_SCHEMA` | Same (optional) | `public` (default in `netlify.toml`) |

**Important:** On the **staging** Netlify site, all contexts should use the **staging** Supabase project — including Deploy Previews. Never point PR previews at production Supabase.

### Production site (separate Netlify site, `main` branch only)

| Variable | Scope | Value |
|----------|--------|--------|
| `VITE_SUPABASE_URL` | **Production** only | Production Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | **Production** only | Production anon key |

Do **not** enable Deploy Previews on the production site (see step 3), or scope preview vars to staging Supabase if you must share one site.

Get keys from Supabase → **Project Settings → API**.

---

## 3. Enable Deploy Previews

On the **staging** Netlify site:

1. **Site configuration → Build & deploy → Continuous deployment**
2. **Branches and deploy contexts**
3. Set **Production branch** to `staging` (for this site)
4. Under **Deploy Previews**, choose **Any pull request against your production branch** (or all branches if you prefer)
5. **Branch deploys:** optional — enable if you want URLs for pushes to feature branches without opening a PR
6. Save

### Recommended: disable previews on production site

On your **production** Netlify site (`main` branch):

- **Deploy Previews → None** (or don’t connect PR builds)

That avoids duplicate builds and prevents accidental preview deploys against production config.

---

## 4. Open a pull request

1. Create a feature branch from `staging`
2. Push and open a PR **into `staging`**
3. Netlify bot comments on the PR with **Deploy Preview** link, e.g.  
   `https://deploy-preview-12--mini-step-pos-staging.netlify.app`
4. Test login, POS checkout, and `/reports` refresh on that URL

Preview deploys use **0 credits**. Merging to `staging` triggers a **production deploy for that site** (15 credits).

---

## 5. Verify the preview works

Checklist on the preview URL:

- [ ] App loads (no “Missing Supabase environment variables”)
- [ ] Staff login with **staging** credentials
- [ ] Products appear on POS
- [ ] Complete a test sale
- [ ] Hard refresh on `/reports` — no 404 (SPA redirect from `netlify.toml`)

---

## 6. Credit-friendly workflow

```
Feature branch → PR → Deploy Preview (0 credits) → review
       ↓
Merge to staging → staging site deploy (15 credits) → client UAT
       ↓
Merge to main → production site deploy (15 credits) → store iPads
```

- Use **PR previews** for daily development
- Limit merges to `staging` / `main` to stay within Free tier credits (~300/month)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on Netlify | Check deploy log; ensure `NODE_VERSION=20` (set in `netlify.toml`) |
| White screen / Supabase error | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Deploy Previews** scope |
| `/inventory` 404 on refresh | Confirm `netlify.toml` is on the branch Netlify builds |
| Preview talks to production DB | Re-check env var scopes on the staging site |
| No preview link on PR | Deploy Previews enabled? PR targets `staging`? Netlify GitHub App installed? |

---

## Local parity

```bash
cp .env.example .env.local
# Edit .env.local with staging Supabase credentials
npm install
npm run dev
```

See also [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).
