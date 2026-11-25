# Architecture Overview

- **Shared (`shared/src/`)**: Pure TypeScript domain types, minor-unit integer money helpers (`PHP`, `MYR`, `JPY`, `USD`), Zod schemas, 61 standardized ingredients, regional NCR price catalog, and 38 Filipino home recipes.
- **Server (`server.ts`, `server/src/`)**: Express HTTP server verifying Firebase ID tokens (`email_verified` required), running the deterministic Meal Plan Engine (`candidates`, `scaling`, `trips`, `packing`, `nutrition`, `solver`), and proxying `@google/genai` structured recipe generation with spend & rate guards.
- **Client (`src/`)**: React 19 SPA with CSS Modules, React Query, Zustand wizard draft store, Firebase modular Auth + Firestore persistence, and a Three.js interactive 3D Filipino kitchen diorama hero.
