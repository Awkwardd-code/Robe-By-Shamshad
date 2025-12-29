# Copilot Instructions for robe_by_shamshad

## Project Overview
- This is a Next.js monorepo using the app directory structure, TypeScript, and custom middleware.
- Major features are organized under `src/app/(dashboard)/(admin)` and `src/app/(dashboard)/(root)`, with each subfolder representing a domain (e.g., categories, collections, coupons, products, users).
- API routes are implemented in `src/app/api/`, following RESTful conventions and dynamic routing (e.g., `[id]`, `[slug]`).
- Shared UI components are in `src/components/` and `src/app/(dashboard)/(admin)/[domain]/_components/`.
- Context providers for authentication, commerce, and buying logic are in `src/context/`.
- Utility and data mapping logic is in `src/lib/`.
- Database client is in `src/db/client.ts`.

## Developer Workflows
- **Start Dev Server:** `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (uses `eslint.config.mjs`)
- **Type Checking:** `tsc --noEmit` (uses `tsconfig.json`)
- **Global Styles:** Edit `src/app/globals.css`.
- **API Development:** Place new endpoints in `src/app/api/[domain]/route.ts` or dynamic folders.

## Project-Specific Patterns
- **Domain-Driven Structure:** Each admin domain (categories, collections, etc.) has its own folder with a `page.tsx` and `_components` for modularity.
- **Dynamic Routing:** Uses Next.js dynamic segments (`[id]`, `[slug]`) for resource-specific pages and API endpoints.
- **Context Usage:** Use React context from `src/context/` for cross-cutting concerns (auth, commerce, buy-now logic).
- **Component Organization:** UI components are split between global (`src/components/ui/`) and domain-specific (`_components` in each domain folder).
- **Lib Utilities:** Business logic and helpers are in `src/lib/`, e.g., `combo-detail-mapper.ts`, `currency.ts`.

## Integration Points
- **External Services:** Cloudinary integration in `src/app/api/cloudinary/upload/`.
- **Session/Auth:** Auth endpoints in `src/app/api/auth/` and context in `src/context/AuthContext.tsx`.
- **Database:** Access via `src/db/client.ts`.

## Conventions
- **TypeScript everywhere; types in `src/types/`**
- **Use Next.js app directory conventions for routing and layouts.**
- **API endpoints follow RESTful patterns and use dynamic routing for resource access.**
- **Component and context naming is domain-specific and descriptive.**

## Key Files & Directories
- `src/app/(dashboard)/(admin)/[domain]/page.tsx` — Admin domain pages
- `src/app/api/[domain]/route.ts` — API endpoints
- `src/components/ui/` — Shared UI components
- `src/context/` — React context providers
- `src/lib/` — Utilities and business logic
- `src/db/client.ts` — Database client
- `src/types/` — TypeScript types

---

**For updates, merge new conventions and patterns here. Ask for feedback if any section is unclear or incomplete.**
