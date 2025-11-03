Tutor Queue built with Next.js 14 App Router, Supabase, and Tailwind CSS.

## Setup

1) Create the database table and policies in Supabase

Run the SQL in `supabase/schema.sql` in your Supabase project's SQL editor.

2) Configure environment variables

Create a file named `.env.local` at the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

3) Start the dev server

```bash
npm run dev
```

Open `http://localhost:3000` for the Student Submission page. Visit `http://localhost:3000/tutor` for the Tutor Dashboard.

To access the dashboard, create a user in Supabase Auth (email/password) and sign in. Realtime updates are powered by Supabase Realtime.
