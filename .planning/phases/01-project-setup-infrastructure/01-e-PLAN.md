---
phase: 01-project-setup-infrastructure
plan: e
type: execute
wave: 2
depends_on: ["01-a"]
files_modified:
  - eslint.config.mjs
  - .prettierrc.json
  - .prettierignore
  - commitlint.config.js
  - .husky/pre-commit
  - .husky/commit-msg
autonomous: true

must_haves:
  truths:
    - "ESLint flat config lints TypeScript and Next.js code"
    - "Prettier formats code consistently across all packages"
    - "Pre-commit hook runs lint-staged on changed files"
    - "Commit messages are validated against Conventional Commits format"
    - "pnpm lint and pnpm format commands work from root"
  artifacts:
    - path: "eslint.config.mjs"
      provides: "ESLint 9 flat configuration"
      contains: "tseslint"
    - path: ".prettierrc.json"
      provides: "Prettier formatting rules"
      contains: "singleQuote"
    - path: "commitlint.config.js"
      provides: "Conventional Commits enforcement"
      contains: "config-conventional"
    - path: ".husky/pre-commit"
      provides: "Pre-commit hook running lint-staged"
      contains: "lint-staged"
    - path: ".husky/commit-msg"
      provides: "Commit message validation hook"
      contains: "commitlint"
  key_links:
    - from: ".husky/pre-commit"
      to: "package.json"
      via: "lint-staged config"
      pattern: "lint-staged"
    - from: "eslint.config.mjs"
      to: "tsconfig.json"
      via: "TypeScript parser project"
      pattern: "projectService"
---

<objective>
Configure developer tooling: ESLint 9 flat config, Prettier, pre-commit hooks (husky + lint-staged), and Conventional Commits enforcement.

Purpose: Ensures code quality and consistency from the first commit. All developers (and Claude agents) produce uniformly formatted, linted code with structured commit messages.

Output: ESLint, Prettier, husky, lint-staged, and commitlint configurations ready for development.
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
@.planning/phases/01-project-setup-infrastructure/01-RESEARCH.md
@.planning/phases/01-project-setup-infrastructure/01-a-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Configure ESLint 9 flat config and Prettier</name>
  <files>
    eslint.config.mjs
    .prettierrc.json
    .prettierignore
  </files>
  <action>
    First, add ESLint and Prettier devDependencies to root package.json (read current, add to devDependencies):
    - eslint: "^9.0.0"
    - @eslint/js: "^9.0.0"
    - typescript-eslint: "^8.0.0"
    - eslint-config-next: "^14.2.0"
    - eslint-config-prettier: "^9.1.0"
    - prettier: "^3.4.0"

    Create `eslint.config.mjs` (ESLint 9 flat config, ESM):
    ```javascript
    import eslint from '@eslint/js';
    import tseslint from 'typescript-eslint';
    import prettierConfig from 'eslint-config-prettier';

    export default tseslint.config(
      // Base recommended rules
      eslint.configs.recommended,

      // TypeScript strict type-checked rules
      ...tseslint.configs.strict,

      // TypeScript parser options
      {
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
          },
        },
      },

      // Custom rules
      {
        rules: {
          // Allow unused vars with underscore prefix
          '@typescript-eslint/no-unused-vars': ['error', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          }],
          // Consistent type imports
          '@typescript-eslint/consistent-type-imports': ['error', {
            prefer: 'type-imports',
            fixStyle: 'inline-type-imports',
          }],
        },
      },

      // Prettier must be last to override conflicting rules
      prettierConfig,

      // Global ignores
      {
        ignores: [
          '**/node_modules/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          'docker/**',
          'k8s/**',
          '.planning/**',
        ],
      },
    );
    ```

    NOTE: Do NOT include eslint-config-next in the flat config for Phase 1. Next.js ESLint integration in flat config requires extra setup that may conflict. Start with TypeScript-eslint + Prettier. Add Next.js rules in Phase 4 when frontend work begins. Per Claude's discretion on exact ESLint rule configuration.

    Create `.prettierrc.json`:
    ```json
    {
      "semi": true,
      "trailingComma": "all",
      "singleQuote": true,
      "printWidth": 100,
      "tabWidth": 2,
      "useTabs": false,
      "bracketSpacing": true,
      "arrowParens": "always",
      "endOfLine": "lf"
    }
    ```

    Create `.prettierignore`:
    ```
    node_modules
    .next
    dist
    build
    coverage
    pnpm-lock.yaml
    .planning
    docker
    k8s
    ```
  </action>
  <verify>
    - File `eslint.config.mjs` exists with tseslint and prettierConfig
    - File `.prettierrc.json` exists with singleQuote: true
    - File `.prettierignore` exists
    - Root package.json devDependencies include eslint, typescript-eslint, prettier
  </verify>
  <done>ESLint 9 flat config and Prettier are configured with TypeScript strict rules, consistent type imports, and Prettier integration.</done>
</task>

<task type="auto">
  <name>Task 2: Configure husky pre-commit hooks and lint-staged</name>
  <files>
    .husky/pre-commit
    .husky/commit-msg
  </files>
  <action>
    Add husky, lint-staged, and commitlint devDependencies to root package.json:
    - husky: "^9.0.0"
    - lint-staged: "^15.0.0"
    - @commitlint/cli: "^19.0.0"
    - @commitlint/config-conventional: "^19.0.0"

    Add lint-staged configuration to root package.json:
    ```json
    "lint-staged": {
      "*.{ts,tsx}": [
        "eslint --fix",
        "prettier --write"
      ],
      "*.{json,yml,yaml,css,md}": [
        "prettier --write"
      ]
    }
    ```

    Initialize husky (create .husky directory):
    Run `npx husky init` OR manually create `.husky/` directory.

    Create `.husky/pre-commit`:
    ```bash
    npx lint-staged
    ```

    Create `.husky/commit-msg`:
    ```bash
    npx --no-install commitlint --edit "$1"
    ```

    NOTE: Husky v9 simplified the hook format. No need for `. "$(dirname -- "$0")/_/husky.sh"` preamble. Just the command directly.

    Make both hook files executable (important for Unix/Mac users):
    ```bash
    chmod +x .husky/pre-commit .husky/commit-msg
    ```
  </action>
  <verify>
    - File `.husky/pre-commit` exists and contains "lint-staged"
    - File `.husky/commit-msg` exists and contains "commitlint"
    - Root package.json has lint-staged config section
    - Root package.json devDependencies include husky, lint-staged, @commitlint/cli
  </verify>
  <done>Pre-commit hooks run lint-staged (ESLint + Prettier on changed files) and commit-msg hook validates Conventional Commits format.</done>
</task>

<task type="auto">
  <name>Task 3: Configure commitlint for Conventional Commits</name>
  <files>
    commitlint.config.js
  </files>
  <action>
    Create `commitlint.config.js` (CJS for compatibility):
    ```javascript
    /** @type {import('@commitlint/types').UserConfig} */
    export default {
      extends: ['@commitlint/config-conventional'],
      rules: {
        // Enforce scope from project segments + common scopes
        'scope-enum': [
          2,
          'always',
          [
            'database',
            'backend',
            'frontend',
            'devops',
            'docs',
            'shared',
            'events',
            'ui',
            'web',
            'deps',
          ],
        ],
        // Scope is optional (allow scopeless commits like "chore: update deps")
        'scope-empty': [0],
        // Subject max length
        'subject-max-length': [2, 'always', 100],
      },
    };
    ```

    The scope-enum includes:
    - Project segments: database, backend, frontend, devops
    - Package names: shared, events, ui, web
    - Common: docs, deps
    - Per CONTEXT.md: Conventional Commits enforced with segment-based scopes
  </action>
  <verify>
    - File `commitlint.config.js` exists
    - Contains @commitlint/config-conventional extension
    - scope-enum includes all required scopes: database, backend, frontend, devops, docs
    - Test with: `echo "feat(database): add schema" | npx commitlint` (should pass after install)
    - Test with: `echo "bad commit message" | npx commitlint` (should fail after install)
  </verify>
  <done>Commitlint enforces Conventional Commits with project-specific scopes matching the 4-segment development model.</done>
</task>

</tasks>

<verification>
1. `eslint.config.mjs` exists with TypeScript strict rules and Prettier integration
2. `.prettierrc.json` and `.prettierignore` exist
3. `.husky/pre-commit` runs lint-staged
4. `.husky/commit-msg` runs commitlint
5. `commitlint.config.js` enforces Conventional Commits with segment scopes
6. Root package.json has all required devDependencies and lint-staged config
</verification>

<success_criteria>
Developer tooling is fully configured. After `pnpm install` (Plan 01-g), `pnpm lint` runs ESLint, `pnpm format` runs Prettier, and git hooks enforce code quality and commit message standards.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-e-SUMMARY.md`
</output>
