# BizKhata — Supabase + Vercel Setup Checklist

## Why the app needs Supabase

On Vercel, serverless functions are **stateless** — every API call may spin up
a fresh container. Without Supabase, all data is lost between requests.
Supabase is the only persistent store.

---

## Step 1 — Create Supabase Project

1. Go to https://supabase.com → New Project
2. Note your **Project URL** and **anon/public API key** from:
   Settings → API → Project URL & Project API Keys

---

## Step 2 — Run the Schema SQL

1. In Supabase dashboard → SQL Editor → New Query
2. Copy the contents of `supabase_schema.sql` (Option A block only — the
   `bizkhata_state` table with JSONB state column)
3. Click **Run**

You should see the `bizkhata_state` table created with one seed row.

---

## Step 3 — Set Environment Variables in Vercel

In your Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase Project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `VERCEL` | `1` |

> **Without these, every Vercel restart loses all your data.**

---

## Step 4 — Supabase RLS Policy

The schema already enables RLS on `bizkhata_state` with an open policy
(allow all authenticated + anon reads/writes). This is fine for a
single-org deployment. For multi-tenant production, tighten with JWT claims.

---

## Step 5 — Verify Connection

After deploying, open the app. In the bottom bar you should see:
- 🟢 **SUPABASE CLOUD SYNCED** — working correctly
- 🟡 **SUPABASE fallback LOCAL** — env vars missing or wrong

---

## Common Issues

| Symptom | Fix |
|---|---|
| Data resets on every page refresh | `SUPABASE_URL` / `SUPABASE_ANON_KEY` not set in Vercel |
| "relation does not exist" error | Schema SQL not run in Supabase |
| 500 errors on `/api/*` | Check Vercel function logs (Project → Deployments → Functions tab) |
| Supabase timeout | Check Supabase project is not paused (free tier pauses after 1 week idle) |

---

## Architecture Overview

```
Browser → Vercel (Static dist/)
Browser → Vercel API Function (/api/index.ts → server.ts Express)
                                    ↕
                             Supabase PostgreSQL
                         (bizkhata_state JSONB table)
```

All state is stored as a single JSONB blob in `bizkhata_state` row
with id = `default_ledger`. Read: SELECT on load. Write: UPSERT on every save.
