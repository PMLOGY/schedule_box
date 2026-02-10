---
phase: 01-project-setup-infrastructure
plan: c
type: execute
wave: 2
depends_on: ["01-a"]
files_modified:
  - apps/web/package.json
  - apps/web/tsconfig.json
  - apps/web/next.config.mjs
  - apps/web/next-env.d.ts
  - apps/web/tailwind.config.ts
  - apps/web/postcss.config.mjs
  - apps/web/app/layout.tsx
  - apps/web/app/page.tsx
  - apps/web/app/globals.css
autonomous: true

must_haves:
  truths:
    - "Next.js 14 app exists at apps/web with App Router"
    - "TypeScript strict mode is enabled"
    - "Tailwind CSS is configured and working"
    - "Next.js standalone output is configured for Docker builds"
    - "Workspace packages are listed in transpilePackages"
  artifacts:
    - path: "apps/web/package.json"
      provides: "Next.js app package definition"
      contains: "@schedulebox/web"
    - path: "apps/web/next.config.mjs"
      provides: "Next.js configuration with standalone output"
      contains: "standalone"
    - path: "apps/web/app/layout.tsx"
      provides: "Root layout component"
      contains: "RootLayout"
    - path: "apps/web/app/page.tsx"
      provides: "Home page component"
      contains: "export default"
    - path: "apps/web/tailwind.config.ts"
      provides: "Tailwind CSS configuration"
      contains: "content"
  key_links:
    - from: "apps/web/package.json"
      to: "packages/shared/package.json"
      via: "workspace:* dependency"
      pattern: "@schedulebox/shared.*workspace"
    - from: "apps/web/next.config.mjs"
      to: "packages/ui"
      via: "transpilePackages"
      pattern: "transpilePackages"
---

<objective>
Set up the Next.js 14 application with App Router, TypeScript, Tailwind CSS, and workspace package references.

Purpose: The web app is the primary frontend and API host. This plan creates a working Next.js 14 app that can start in dev mode and serve as the foundation for all frontend and API route development.

Output: A functional Next.js 14 app at apps/web/ with Tailwind CSS, standalone output, and workspace dependencies.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-project-setup-infrastructure/01-CONTEXT.md
@.planning/phases/01-project-setup-infrastructure/01-a-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Next.js 14 app package and configuration</name>
  <files>
    apps/web/package.json
    apps/web/tsconfig.json
    apps/web/next.config.mjs
    apps/web/postcss.config.mjs
    apps/web/tailwind.config.ts
  </files>
  <action>
    Create `apps/web/package.json`:
    - name: "@schedulebox/web"
    - version: "0.0.0"
    - private: true
    - type: "module"
    - scripts:
      - "dev": "next dev"
      - "build": "next build"
      - "start": "next start"
      - "type-check": "tsc --noEmit"
    - dependencies:
      - "next": "^14.2.21"
      - "react": "^18.3.1"
      - "react-dom": "^18.3.1"
      - "@schedulebox/shared": "workspace:*"
      - "@schedulebox/ui": "workspace:*"
      - "@schedulebox/events": "workspace:*"
      - "@schedulebox/database": "workspace:*"
    - devDependencies:
      - "@types/react": "^18.3.0"
      - "@types/react-dom": "^18.3.0"
      - "typescript": "^5.6.0"
      - "tailwindcss": "^3.4.0"
      - "postcss": "^8.4.0"
      - "autoprefixer": "^10.4.0"

    Create `apps/web/tsconfig.json`:
    ```json
    {
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "baseUrl": ".",
        "jsx": "preserve",
        "plugins": [{ "name": "next" }],
        "paths": {
          "@/*": ["./app/*", "./components/*", "./lib/*"],
          "@/app/*": ["./app/*"],
          "@/components/*": ["./components/*"],
          "@/lib/*": ["./lib/*"]
        }
      },
      "include": [
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        ".next/types/**/*.ts"
      ],
      "exclude": ["node_modules", ".next"]
    }
    ```

    Create `apps/web/next.config.mjs`:
    ```javascript
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      output: 'standalone',
      transpilePackages: [
        '@schedulebox/ui',
        '@schedulebox/shared',
        '@schedulebox/events',
        '@schedulebox/database',
      ],
      experimental: {
        // Enable server actions for future phases
      },
    };

    export default nextConfig;
    ```

    Create `apps/web/postcss.config.mjs`:
    ```javascript
    /** @type {import('postcss-load-config').Config} */
    const config = {
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      },
    };

    export default config;
    ```

    Create `apps/web/tailwind.config.ts`:
    ```typescript
    import type { Config } from 'tailwindcss';

    const config: Config = {
      content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        '../../packages/ui/src/**/*.{ts,tsx}',
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    };

    export default config;
    ```
  </action>
  <verify>
    - File `apps/web/package.json` has name "@schedulebox/web" and all workspace:* dependencies
    - File `apps/web/next.config.mjs` has output: 'standalone' and transpilePackages array
    - File `apps/web/tsconfig.json` extends root tsconfig with jsx: "preserve"
    - File `apps/web/tailwind.config.ts` includes packages/ui content path
  </verify>
  <done>Next.js 14 app package is configured with standalone output, workspace dependencies, Tailwind CSS, and TypeScript.</done>
</task>

<task type="auto">
  <name>Task 2: Create App Router layout, page, and styles</name>
  <files>
    apps/web/app/layout.tsx
    apps/web/app/page.tsx
    apps/web/app/globals.css
  </files>
  <action>
    Create `apps/web/app/globals.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

    Create `apps/web/app/layout.tsx`:
    ```tsx
    import type { Metadata } from 'next';
    import './globals.css';

    export const metadata: Metadata = {
      title: 'ScheduleBox',
      description: 'AI-powered reservation and scheduling platform',
    };

    export default function RootLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <html lang="cs">
          <body>{children}</body>
        </html>
      );
    }
    ```
    Note: `lang="cs"` for Czech as the primary market (per documentation).

    Create `apps/web/app/page.tsx`:
    ```tsx
    export default function HomePage() {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
          <h1 className="text-4xl font-bold">ScheduleBox</h1>
          <p className="mt-4 text-lg text-gray-600">
            AI-powered reservation and scheduling platform
          </p>
          <p className="mt-2 text-sm text-gray-400">
            v{process.env.APP_VERSION || '1.0.0'} &mdash; Phase 1: Infrastructure
          </p>
        </main>
      );
    }
    ```

    Also create empty placeholder directories with .gitkeep:
    - `apps/web/components/.gitkeep`
    - `apps/web/lib/.gitkeep`
  </action>
  <verify>
    - File `apps/web/app/layout.tsx` exists with RootLayout component and metadata
    - File `apps/web/app/page.tsx` exists with HomePage component
    - File `apps/web/app/globals.css` includes Tailwind directives
    - Directories `apps/web/components/` and `apps/web/lib/` exist
  </verify>
  <done>Next.js App Router has root layout with Czech locale, a basic home page, Tailwind styles, and placeholder directories for future components.</done>
</task>

</tasks>

<verification>
1. apps/web/ has a complete Next.js 14 project structure
2. package.json references all four workspace packages via workspace:*
3. next.config.mjs has standalone output and transpilePackages
4. App Router has layout.tsx and page.tsx
5. Tailwind CSS is configured with content paths including packages/ui
</verification>

<success_criteria>
A functional Next.js 14 app exists at apps/web/ that can be started with `pnpm dev` (after install). It uses App Router, TypeScript strict mode, Tailwind CSS, and references all workspace packages.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-c-SUMMARY.md`
</output>
