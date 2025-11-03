Tutor Queue — Next.js 14 + Supabase + Tailwind

Deployed to Vercel. Use the links and test login below to try it out.

## Live URLs

- Student Queue (join the queue):
  - https://tutor-queue.vercel.app/

- Tutor Dashboard (manage the queue):
  - https://tutor-queue.vercel.app/tutor

## Test Tutor Login

Use a test tutor account that you create in Supabase Auth → Users.

- Email: csqueue@usu.com
- Password: password

## How It Works

- Students submit their name and topic at `/`
- Tutors sign in at `/tutor` (email/password)
- Requests appear in real-time (Supabase Realtime). Tutors can:
  - Mark Seen — changes status to `seen`
  - Remove — deletes the request
- List updates in real-time and also optimistically as actions are taken

