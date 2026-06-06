# Gryf.ai Workflow

Platforma do tworzenia i zarządzania procesami biznesowymi z wizualnym edytorem (React Flow).

## Stack

| Warstwa | Technologia |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| State | Zustand + Zundo (undo/redo) |
| UI | Tailwind CSS, Radix UI, Framer Motion, Lucide Icons |
| Canvas | React Flow 12 (@xyflow/react) |
| Backend | PocketBase (osobny kontener) |
| i18n | i18next (PL + EN) |
| Testy | Vitest (unit) + Playwright (e2e) |

## Szybki start

```bash
# 1. Sklonuj repo
git clone https://github.com/dwachalowicz/WORKFLOW.git
cd WORKFLOW

# 2. Zainstaluj zależności
npm ci

# 3. Skopiuj zmienne środowiskowe
cp .env.example .env

# 4. Uruchom dev server
npm run dev
```

Aplikacja startuje na `http://localhost:5173`. Wymaga działającego PocketBase na `VITE_PB_URL`.

## Zmienne środowiskowe

| Zmienna | Opis | Default |
|---|---|---|
| `VITE_PB_URL` | URL PocketBase API | `https://pb.gryf.ai` |

> **Uwaga:** `VITE_PB_URL` jest baked into JS bundle w czasie builda. Zmiana wymaga przebudowy.

## Skrypty npm

```bash
npm run dev          # Dev server (HMR)
npm run build        # Production build (tsc + vite)
npm run preview      # Podgląd builda
npm run lint         # ESLint
npm run typecheck    # TypeScript check (tsc --noEmit)
npm test             # Unit tests (Vitest, 108 testów)
npm run test:e2e     # E2e smoke tests (Playwright, 19 testów)
npm run test:e2e:auth # E2e authenticated tests (9 testów, wymaga .auth/user.json)
npm run test:all     # typecheck + unit + e2e smoke
```

## Docker (produkcja)

### Build lokalny
```bash
docker build -t gryf-workflow .
docker run -p 3000:8080 gryf-workflow
```

### Z custom PB URL
```bash
docker build --build-arg VITE_PB_URL=https://pb.example.com -t gryf-workflow .
```

### Coolify
W Coolify:
1. **Source**: GitHub repo
2. **Build Pack**: Dockerfile
3. **Build Arguments**: `VITE_PB_URL=https://pb.gryf.ai`
4. **Port**: 8080
5. **Health Check Path**: `/`

Dockerfile wykonuje multi-stage build:
- **Stage 1** (node:22-alpine): `npm ci` + `npm run build`
- **Stage 2** (nginx:1.27-alpine): serwuje statyczne pliki z gzip, cache 1y na assets, SPA fallback

## Architektura

```
src/
├── components/       # Komponenty UI
│   ├── canvas/       # React Flow (GryfCanvas, nodes, edges)
│   ├── dashboard/    # Taby dashboardu (lazy-loaded)
│   ├── modals/       # Modale (lazy-loaded)
│   └── ui/           # Primitives (Button, Input, Tooltip)
├── lib/              # Utilities
│   ├── pocketbase.ts # TypedPocketBase (15 kolekcji)
│   ├── schemas.ts    # Zod validation
│   ├── parseUtils.ts # Parsowanie + sanitization
│   └── errorHandler.ts # tryCatchToast()
├── pages/            # Route pages (lazy-loaded)
├── store/            # Zustand stores
│   ├── workflowStore.ts
│   ├── authStore.ts
│   ├── toastStore.ts
│   └── confirmStore.ts
└── i18n/             # Tłumaczenia (PL + EN)
```

## Testy

### Unit (Vitest)
108 testów pokrywających: stores, Zod schemas, parse utils, error handling, tier limits, modals.

### E2e (Playwright)
28 testów: smoke (login, auth guards, a11y, responsive), authenticated (dashboard, CRUD, canvas).

```bash
# Setup auth dla e2e (interaktywny — otwiera przeglądarkę)
npx playwright test e2e/auth-setup.spec.ts --headed
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. **Lint & Type Check** — `tsc --noEmit` + `eslint`
2. **Unit Tests** — `vitest run`
3. **Production Build** — `vite build` + artifact upload
4. **Docker Build** — buduje obraz (tylko na `main`)

## Licencja

Proprietary — © Gryf.ai
