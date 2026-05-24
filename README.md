# Frieren Portfolio (Next.js 15)

This project is a Next.js 15 + TypeScript + Tailwind 4 migration of the Frieren-themed AI developer portfolio.

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4 (via `@tailwindcss/postcss`)
- Framer Motion, GSAP, Lenis, Lucide

## Run Locally

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Build for production:
   - `npm run build`

## Structure

- `app/` route shell, metadata, global styles
- `components/layout/` nav, footer, scroll progress
- `components/sections/` hero, skills, projects, timeline, contact
- `lib/data.ts` central content + typed section data
- `public/assets/svg/` Frieren visual assets

## Notes

- Update `https://example.com` in `app/robots.ts` and `app/sitemap.ts` to your real domain.
- Replace placeholder project/contact links in `lib/data.ts`.
