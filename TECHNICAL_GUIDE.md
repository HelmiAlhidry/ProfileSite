# Technical Architecture & Developer Guide

This document outlines the architecture, database schema, local development environment, and deployment workflow for the Bilingual Full-Stack Portfolio Application.

---

## 📂 Project Structure

```text
├── api/
│   └── index.js             # Vercel Serverless Function entry point (ESM wrapper)
├── dist/                    # Compiled production assets (static HTML/CSS/JS)
├── public/                  # Static assets (avatars, icons, favicon)
├── server/
│   ├── data/
│   │   └── db.json          # Local file-based database fallback (Development only)
│   ├── db.cjs               # Relational PostgreSQL Database Engine & migrations
│   └── index.cjs            # Express REST API routes & middleware
├── src/
│   ├── assets/              # Developer styling assets & default images
│   ├── components/
│   │   └── DynamicIcon.jsx  # Icon renderer with custom brand SVG fallbacks
│   ├── data/
│   │   ├── defaultData.json # Default seeder data & backup template
│   │   └── translations.js  # English & Arabic localized strings
│   ├── utils/
│   │   ├── api.js           # Client-side API fetch utilities
│   │   └── helpers.js       # Color, validation, and ID generator helpers
│   ├── views/
│   │   ├── AdminPanel.jsx   # Locked portfolio administration dashboard
│   │   └── PublicSite.jsx   # Fully responsive, bilingual visitor homepage
│   ├── App.css              # Frontend styling overrides
│   ├── App.jsx              # Main Router, accent synchronizer, and loader
│   ├── index.css            # Base Tailwind-free custom CSS design system
│   └── main.jsx             # React DOM renderer entry
├── package.json             # NPM dependencies, scripts, and ESM configurations
├── vercel.json              # Vercel rewrite configuration for serverless routing
└── DATABASE_URL.txt         # Plaintext file containing Supabase connection string
```

---

## 🗄️ Database Architecture & Schemas

The database engine (`server/db.cjs`) is a hybrid layer that supports PostgreSQL in production and a local read/write JSON file in development. 

### 1. PostgreSQL Schema Mapping
The database consists of 9 tables:
1. **`settings`**: Visual settings (theme, default language, passcode hash, primary/secondary accents, and section visibility toggles).
2. **`personal_profile`**: Visitor contact emails, phone, bio summaries, cv links, location coordinates, and base64 avatars.
3. **`about_profile`**: Full biography text blocks and experience/completed project numeric stats.
4. **`skills`**: Individual skill percentages, categories, and bilingual names.
5. **`timeline_entries`**: Educational degrees and professional experience histories.
6. **`services`**: Price, custom icon names, and bilingual descriptions.
7. **`projects`**: Tags list, cover photo, title, and visitor redirect link.
8. **`blog_posts`**: Date, read times, and rich-text articles.
9. **`messages`**: Visitor feedback inbox logs (name, email, subject, text, date).

---

## 🛠️ Step-by-Step Developer Guide

If you need to update, modify, or extend this application, follow these guidelines:

### Step 1: Install Local Dependencies
To set up your project dependencies locally, run:
```bash
npm install
```

### Step 2: Configure Database Connections
* **Production / Supabase**: Add your Supabase IPv4 transaction pooler connection string to a file named `DATABASE_URL.txt` in the root folder, or set the environment variable:
  ```text
  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
* **Local Fallback**: If `DATABASE_URL.txt` is missing or empty, the server automatically reads and writes to `server/data/db.json` inside your project folder. 

### Step 3: Run the Application Locally
Open two terminal windows to run the frontend and backend concurrently:
* **Terminal 1 (Backend API Server)**:
  ```bash
  npm run server
  ```
  *(Runs on `http://localhost:5000`)*
* **Terminal 2 (Vite Frontend Development)**:
  ```bash
  npm run dev
  ```
  *(Runs on `http://localhost:5173`)*

---

## 🔄 Adding New Database Fields (Migrations)

If you need to add a new option or field to the website:

1. **Update `server/db.cjs` Schema Initialization**:
   * Add the new column to the `CREATE TABLE` query inside `initSqlDb()`.
   * Add a migration check `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` inside `initSqlDb()` to guarantee pre-existing databases are updated on boot.
2. **Update the Data Mapping Utilities**:
   * In `getSqlData()`, map the new SQL row property to the matching JSON property.
   * In `saveSqlData()`, pass the new JSON property as a parameter into the SQL `INSERT / ON CONFLICT` statement.
3. **Update Local Default Template**:
   * Add the property with a default fallback value to `src/data/defaultData.json` so database resets initialize it cleanly.
4. **Update Frontend UI**:
   * In `AdminPanel.jsx`, add the corresponding input field (text box, checkbox, etc.) to allow updating the new value.
   * In `PublicSite.jsx`, read the new property from `data` and render it inside the matching homepage element.

---

## 🚀 Deploying Code Updates to Vercel

Vercel is linked directly to your GitHub repository and automatically deploys all code updates.

1. **Commit and Push Your Code**:
   When you finish modifying your code, open a command line inside the project folder and run:
   ```bash
   # 1. Stage changes
   git add .
   
   # 2. Commit changes
   git commit -m "Describe your code updates here"
   
   # 3. Push to GitHub
   git push
   ```
2. **Auto-Build Monitoring**:
   * Vercel will instantly detect your git push, download the new code, run `npm run build`, and deploy the serverless functions.
   * The new features will be online in under 30 seconds!
