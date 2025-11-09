# MyPlantDiary

Identify plants from photos, learn care, and keep a personal journal.

## Quickstart
1. **Install deps**
   ```bash
   npm i
   # or: pnpm i / yarn / bun i
   ```
2. **Env** – copy `env.example` → `.env.local` and fill Supabase + provider keys.
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `PLANTNET_API_KEY`.
   - Optional: `NEXT_PUBLIC_SITE_URL` for magic-link redirects, `OPENAI_PLANT_MODEL` to override the default (`gpt-4o-mini`), `PLANTNET_PROJECT` (defaults to `all`).
3. **Supabase (optional local)** – initialize and push schema
   ```bash
   supabase init
   supabase db reset --use-migra
   supabase db push
   supabase db seed --file supabase/seed.sql
   ```
4. **Run**
   ```bash
   npm run dev
   ```

## Endpoints
- POST `/api/identify` – calls `lib/ai/identifyPlant.ts`
- POST `/api/disease` – calls `lib/ai/diagnosePlant.ts`
