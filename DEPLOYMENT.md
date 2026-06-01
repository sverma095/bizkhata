# 🚀 Bizkhata Deployment Guide: Supabase + Vercel Full-Stack Integration

This document outlines the step-by-step process of deploying the full-stack **Bizkhata Invoice & General Ledger CRM platform**. Under this architecture, your frontend is hosted on **Vercel** with global CDN caching, and your state is securely persisted on **Supabase PostgreSQL**.

---

## 🏗️ Deployment Architecture

```
                                  +-------------------+
                                  |   Vercel Edge     |
                                  | (Static Frontend) |
                                  +---------+---------+
                                            |
                                            | Serves Assets
                                            v
+------------------+     Requests     +-----+-----------+
|   User Browser   +------------------>   Vercel Server |
|  (React App)     |                  | (Serverless API)|
+------------------+                  +-----+-----------+
                                            |
                                            | CRUD Operations
                                            v
                                  +---------+---------+
                                  |     Supabase      |
                                  |  (PostgreSQL DB)  |
                                  +-------------------+
```

---

## 📥 Step 1: Export Your Project to GitHub
To deploy your application, you need to sync the codebase with your personal GitHub account.

1. In the **Google AI Studio Build** environment, locate the **Settings / Actions Menu** at the top right header (gear icon or export chevron).
2. Click **Export to GitHub** (or select **Export as ZIP** if you prefer to push it manually from your local command line).
3. If exporting via GitHub integration, authenticate and authorize the repo insertion. Select a repository name of your choice (e.g. `bizkhata-ledger`).
4. Once successfully exported, verify that your new GitHub repository contains files like `package.json`, `vercel.json`, and `/src`.

---

## ⚡ Step 2: Set Up Your Supabase Cloud Database

A configuration helper SQL schema is already provided in `/supabase_schema.sql` inside your project root.

1. Create a free account at [Supabase (https://supabase.com)](https://supabase.com) and click **New Project**.
2. Set your **Project Name** (e.g. `Bizkhata Ledger Database`), select a secure Postgres region close to your target audience, and set a strong database password.
3. Once your database is provisioned (usually takes ~1 minute):
   - Navigate to the **SQL Editor** tab from the left sidebar on the Supabase Dashboard.
   - Click **New Query** to create an empty sql worksheet.
   - Open `/supabase_schema.sql` from your exported project, copy its entire contents, and paste it into the Supabase SQL editor.
   - Click **Run** in the bottom right corner of the editor.
4. Confirm that your SQL query completes successfully. This creates:
   - Your `bizkhata_state` high-speed JSONB State table (stores instant backups).
   - Your highly scalable Relational relational tables (to query and join in the future if desired).

---

## 🔑 Step 3: Retrieve Your Keys from Supabase

To wire your serverless Vercel backend to Supabase, you need two credential URL keys:

1. On your Supabase dashboard, go to **Project Settings** (gear icon at bottom left), then select **API**.
2. Locate and copy the following parameters (you will supply these in Vercel):
   - **Project URL** (This is your `SUPABASE_URL`) e.g. `https://your-proj-id.supabase.co`
   - **Project API Keys - `anon` `public`** (This is your `SUPABASE_ANON_KEY`)

---

## ☁️ Step 4: Deploy Your App on Vercel

Vercel will compile your React Vite frontend into optimized static files and route your backend to dedicated Node.js Serverless Functions out-of-the-box.

1. Create a free account or login at [Vercel (https://vercel.com)](https://vercel.com).
2. Click **Add New** -> **Project** in the top-right.
3. Under "Import Git Repository", select **GitHub** and connect your repo listing. Import your newly created repository (`bizkhata-ledger`).
4. Under **Configure Project**, customize the settings:
   - **Framework Preset**: Vercel will automatically identify and select `Vite` or `Other`. Keep it default (or choose `Vite`).
   - **Root Directory**: `.` (Keep as is).
   - Expand the **Build and Development Settings** section:
     - **Build Command**: Set to `npm run build` or `vite build`
     - **Output Directory**: `dist` (default for Vite).
5. Open the **Environment Variables** section and add the following keys:
   * **`SUPABASE_URL`**: (The Project URL from Step 3)
   * **`SUPABASE_ANON_KEY`**: (The standard `anon` Public API key from Step 3)
   * **`GEMINI_API_KEY`**: (Paste your Google AI Studio API key here to keep the smart invoice commentary and emails working on your domain)
6. Click **Deploy**. Vercel will clone, build, package, and deploy your site in less than 60 seconds!

---

## ✅ Step 5: Verification & Testing

1. Once the deployment completes, Vercel will provide your web application with some free production domains (e.g. `https://bizkhata-ledger.vercel.app`).
2. Open the URL in your browser.
3. Test creating a new Client, an Invoice, or recording a Payment.
4. Go back to your **Supabase Dashboard** -> **Table Editor** (or SQL Editor), and run:
   ```sql
   SELECT * FROM bizkhata_state;
   ```
5. You will see a row with `id = 'default_ledger'` containing the complete JSON representation of your ledger state synced in real-time. Any modifications in the UI will now persist permanently across page refreshes, browser changes, and server reboots!

---

## 🛠️ Advanced: Transitioning to the Relational Database Pattern
If you eventually wish to write standard relational API calls (`SELECT name FROM customers`, etc.) instead of saving states within a single JSON structure:
1. All Postgres relational structures (`customers`, `invoices`, `journal_entries`, etc.) have already been pre-created under your database schema from the `/supabase_schema.sql` file you ran in Step 2.
2. You can progressively refactor the `/server.ts` data endpoints (e.g., `app.get("/api/db")` or `app.post("/api/customers")`) to initiate direct query requests using:
   ```ts
   // Example relational query conversion:
   app.get("/api/customers", async (req, res) => {
     const { data, error } = await supabase.from('customers').select('*');
     if (error) return res.status(500).json({ error: error.message });
     res.json(data);
   });
   ```
