---
phase: 01-project-setup-infrastructure
plan: f
type: execute
wave: 3
depends_on: ["01-e"]
files_modified:
  - .github/workflows/ci.yml
autonomous: true

must_haves:
  truths:
    - "CI pipeline triggers on push to main/develop and PR to main"
    - "Pipeline installs with pnpm and caches the store"
    - "Lint job runs ESLint on all workspace code"
    - "Type-check job runs tsc --noEmit across all packages"
    - "Build job creates Docker image and pushes to ghcr.io (main only)"
    - "Trivy scans Docker image for CRITICAL/HIGH vulnerabilities"
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "GitHub Actions CI/CD pipeline"
      contains: "pnpm/action-setup"
  key_links:
    - from: ".github/workflows/ci.yml"
      to: "package.json"
      via: "pnpm lint and type-check scripts"
      pattern: "pnpm lint|pnpm type-check"
    - from: ".github/workflows/ci.yml"
      to: "docker/Dockerfile"
      via: "Docker build step"
      pattern: "docker/Dockerfile"
---

<objective>
Create the GitHub Actions CI/CD pipeline with lint, type-check, build, and security scanning jobs.

Purpose: Ensures every push and PR is validated for code quality, type safety, and security. The build job creates Docker images for main branch deployments.

Output: .github/workflows/ci.yml with complete CI/CD pipeline.
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
@.planning/phases/01-project-setup-infrastructure/01-e-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create GitHub Actions CI pipeline</name>
  <files>
    .github/workflows/ci.yml
  </files>
  <action>
    Create directory `.github/workflows/` if it doesn't exist.

    Create `.github/workflows/ci.yml` per CONTEXT.md decisions:

    ```yaml
    name: CI Pipeline

    on:
      push:
        branches: [main, develop]
      pull_request:
        branches: [main]

    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true

    jobs:
      # =========================================
      # Job 1: Lint and Type Check
      # =========================================
      lint:
        name: Lint & Type Check
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4

          - name: Setup pnpm
            uses: pnpm/action-setup@v4
            with:
              version: 9

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'pnpm'

          - name: Install dependencies
            run: pnpm install --frozen-lockfile

          - name: Lint
            run: pnpm lint

          - name: Type check
            run: pnpm type-check

      # =========================================
      # Job 2: Build and Push Docker Image
      # =========================================
      build:
        name: Build & Push Docker Image
        runs-on: ubuntu-latest
        needs: lint
        if: github.ref == 'refs/heads/main'
        permissions:
          contents: read
          packages: write
        steps:
          - name: Checkout
            uses: actions/checkout@v4

          - name: Setup pnpm
            uses: pnpm/action-setup@v4
            with:
              version: 9

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'pnpm'

          - name: Install dependencies
            run: pnpm install --frozen-lockfile

          - name: Build Next.js
            run: pnpm --filter @schedulebox/web build

          - name: Login to GitHub Container Registry
            uses: docker/login-action@v3
            with:
              registry: ghcr.io
              username: ${{ github.actor }}
              password: ${{ secrets.GITHUB_TOKEN }}

          - name: Set up Docker Buildx
            uses: docker/setup-buildx-action@v3

          - name: Build and push Docker image
            uses: docker/build-push-action@v6
            with:
              context: .
              file: docker/Dockerfile
              target: production
              push: true
              tags: |
                ghcr.io/${{ github.repository }}:${{ github.sha }}
                ghcr.io/${{ github.repository }}:latest
              cache-from: type=gha
              cache-to: type=gha,mode=max

          - name: Run Trivy vulnerability scanner
            uses: aquasecurity/trivy-action@master
            with:
              image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
              format: 'table'
              severity: 'CRITICAL,HIGH'
              exit-code: '1'
    ```

    Key design decisions per CONTEXT.md:
    - Triggers: push to main/develop, PR to main
    - Concurrency: cancel in-progress for same branch (saves CI minutes)
    - Phase 1: only lint + type-check (test jobs added in later phases)
    - Build: only on main branch push (not PRs or develop)
    - Registry: ghcr.io (GitHub Container Registry)
    - Docker Buildx with GHA caching for faster builds
    - Trivy: CRITICAL/HIGH severity, exit-code 1 to fail the build
    - pnpm v9 with built-in caching via actions/setup-node
  </action>
  <verify>
    - File `.github/workflows/ci.yml` exists
    - Contains `on: push: branches: [main, develop]` and `pull_request: branches: [main]`
    - lint job has pnpm/action-setup, actions/setup-node with cache: 'pnpm'
    - lint job runs `pnpm lint` and `pnpm type-check`
    - build job has `needs: lint` and `if: github.ref == 'refs/heads/main'`
    - build job uses docker/build-push-action with ghcr.io
    - Trivy step has severity: 'CRITICAL,HIGH' and exit-code: '1'
    - YAML syntax is valid (no tabs, proper indentation)
  </verify>
  <done>GitHub Actions CI pipeline validates code quality on every push/PR and builds Docker images on main with security scanning.</done>
</task>

<task type="auto">
  <name>Task 2: Create GitHub Actions dependency review workflow</name>
  <files>
    .github/workflows/dependency-review.yml
  </files>
  <action>
    Create `.github/workflows/dependency-review.yml` for PR dependency auditing:

    ```yaml
    name: Dependency Review

    on:
      pull_request:
        branches: [main]

    permissions:
      contents: read

    jobs:
      dependency-review:
        name: Review Dependencies
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4

          - name: Dependency Review
            uses: actions/dependency-review-action@v4
            with:
              fail-on-severity: critical
              deny-licenses: AGPL-3.0, GPL-3.0
    ```

    This workflow:
    - Runs on PRs to main only
    - Audits new/changed dependencies for known vulnerabilities
    - Fails on critical severity
    - Denies copyleft licenses (AGPL, GPL) that could affect SaaS licensing
  </action>
  <verify>
    - File `.github/workflows/dependency-review.yml` exists
    - Contains actions/dependency-review-action@v4
    - Triggers on pull_request to main
    - Fails on critical severity
  </verify>
  <done>Dependency review workflow audits PR dependencies for vulnerabilities and license compliance.</done>
</task>

</tasks>

<verification>
1. `.github/workflows/ci.yml` has lint and build jobs
2. Lint job runs pnpm lint + pnpm type-check
3. Build job runs only on main, pushes to ghcr.io, scans with Trivy
4. `.github/workflows/dependency-review.yml` audits PR dependencies
5. Both workflows use pnpm v9 and Node.js 20
</verification>

<success_criteria>
CI/CD pipeline is ready. When code is pushed to main/develop or a PR is opened against main, lint and type-check run automatically. On main pushes, Docker images are built, pushed to ghcr.io, and scanned for vulnerabilities.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-f-SUMMARY.md`
</output>
