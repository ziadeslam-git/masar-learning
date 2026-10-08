# مسار | بيئة التعلم الذكية

بيئة تعلم عربية تكيفية لطلاب تكنولوجيا التعليم؛ تقيس تحمّل الغموض وتوجّه كل طالب إلى مسار تعلّم مناسب مع حفظ تقدمه محلياً.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/masar-learning run dev` — run the Masar web app
- `pnpm --filter @workspace/masar-learning run build` — build the static Masar web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/masar-learning/` — the Arabic RTL React app
- `attached_assets/تكنولوجيا_التعليم_والتحول_الرقمي_أربعة_فصول_منظف_1791493489673.md` — curriculum source of truth
- `scripts/build-content.ts` — converts the four source chapters to app curriculum JSON before dev/build
- `artifacts/masar-learning/src/data/assessment.json` — replaceable demo assessment items
- `artifacts/masar-learning/src/lib/config.ts` — learning-path score thresholds

## Architecture decisions

- Masar has no account system, database, or required backend; assessment and progress state stay in browser `localStorage`.
- Keep the assessment replaceable through JSON and derive path selection from the named threshold constants.
- Preserve the attached curriculum text exactly; content JSON is generated from Markdown rather than edited by hand.

## Product

Students complete a 12-item demo assessment, receive one of three adaptive paths, study the same four-chapter curriculum in path-specific ways, and track lesson completion.

## User preferences

- For Masar, do not add login, accounts, database storage, or complex backend services.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
