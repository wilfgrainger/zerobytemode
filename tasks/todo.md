# Task List

## UX/UI Code Review
- [x] Review `src/app/page.tsx` for functional and UX improvements (Weetabix spot context).
- [x] Check for missing keyboard handlers, ARIA labels, and role attributes.
- [x] Review component structure and performance (pure utility functions, etc.).
- [x] Test the frontend behavior.

## Project Constitution & Apex Trinity
- [x] Scaffold `.spec/` directories and files.
- [x] Create `.cursorrules` with operational constraints.
- [x] Write `.spec/system.md` with Architecture, Core Logic, and Vibe.
- [x] Write `.spec/interface.json` defining strict API schemas.
- [x] Write `.spec/infra.md` documenting infrastructure and deployment constraints.

## System Retrofit
- [x] Audit `.spec/interface.json` vs API codebase.
  - [x] Add `GET /auth/verify` endpoint contract.
  - [x] Add `GET /stripe/verify-session` endpoint contract.
  - [x] Add `POST /support` endpoint contract.
- [x] Implement and verify changes.
