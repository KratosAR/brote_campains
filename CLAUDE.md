# CLAUDE.md

Instructions for any agent (Claude Code or otherwise) working in this repository.

## Git Workflow — READ BEFORE COMMITTING ANYTHING

```
development  →  staging  →  main
 (work here)    (pre-prod)   (PRODUCTION)
```

- **`main` is production.** Never work on it, never push to it directly. It only
  advances via a reviewed PR from `staging`.
- **`development` is where all work happens.** Features, fixes, refactors — all
  of it starts here. Direct pushes are allowed (protected only against
  force-push/deletion) so iteration stays fast.
- **`staging` is the pre-prod gate.** Once `development`'s CI is green, a PR
  from `development` → `staging` opens automatically (see Automation below).
  Merging it requires CI green; no mandatory human approval, but review before
  merging if the change is non-trivial.
- **`main` requires a human approval + CI green.** Once `staging` is green, a
  PR `staging` → `main` opens automatically. **Do not merge this PR yourself**
  unless explicitly asked to — it puts code into production.

### Branch protection (enforced by GitHub, not just convention)

| Branch | Force-push/delete | PR required | CI required | Human approval |
|---|---|---|---|---|
| `development` | ❌ blocked | no | no (but push triggers CI) | no |
| `staging` | ❌ blocked | ✅ yes | ✅ `Lint / TypeCheck / Test / Build` | no |
| `main` | ❌ blocked | ✅ yes | ✅ CI + secret scan | ✅ 1 approval, admins included |

## Commit Message Convention — ENFORCED, not optional

Every commit **must** start with an area tag, followed by a normal
[Conventional Commits](https://www.conventionalcommits.org/) `type(scope): subject`:

```
[INFRA] chore(ci): extend security workflows to staging and development
[BACKEND] fix(api): reorder analytics routes before :campaignId
[FRONTEND] feat(web): add campaign wizard step 3
```

- **Tag** — exactly one of `[INFRA]`, `[BACKEND]`, `[FRONTEND]`. Pick the one
  that matches what actually changed (infra/CI/docs vs. `apps/api`+`packages/*`
  vs. `apps/web`). If a commit touches more than one area, split it into
  separate commits.
- **Type** — `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`,
  `build`, `style`, `revert` (standard Conventional Commits types).
- **Scope** — one of the package/app names (see `commitlint.config.js` for the
  full enum): `domain`, `application`, `infrastructure`, `contracts`,
  `common`, `testing`, `sdk`, `api`, `web`, `worker`, `scheduler`, `webhook`,
  `cli`, `meta`, `evolution`, `fake`, `prisma`, `docker`, `ci`, `deps`,
  `config`.

This is enforced two ways — a commit will be **rejected** if it doesn't
comply:
1. Locally, by the `commit-msg` husky hook (`commitlint.config.js`) on every
   `git commit`.
2. In CI, by `.github/workflows/commit-lint.yml` on every PR — even if a hook
   was bypassed locally, the PR check catches it.

## Automation — what runs itself

- **`.github/workflows/ci.yml`** — lint, typecheck, test, build. Runs on push
  to `main`/`staging`/`development`/`feature/*`/`sprint/*` and on PRs into
  `main`/`staging`/`feature/*`/`sprint/*`.
- **`.github/workflows/commit-lint.yml`** — validates every commit in a PR
  against the `[TAG] type(scope): subject` convention above.
- **`.github/workflows/auto-promote.yml`** — the moment CI goes green on
  `development` or `staging`, it opens (or refreshes) a promotion PR to the
  next stage. **It never auto-merges** — `staging`'s merge still needs CI
  green (no approval gate), `main`'s merge always needs a human to click
  merge.
- **`.github/workflows/codeql.yml`**, **`git-secrets.yml`**,
  **`sbom.yml`**, **`security-headers.yml`**, **`e2e.yml`** — security and
  quality gates, now running on `staging`/`development` too (previously only
  ran on `main`), so nothing reaches `main` without having already been
  scanned earlier in the pipeline.

## What this means for you as an agent

1. **Work on `development`.** Don't create ad-hoc feature branches unless
   asked — the fast-push model on `development` already gives you room to
   iterate. If you do create a branch, merge or delete it promptly (don't let
   stale branches accumulate — see `docs/BRANCHING_STRATEGY.md`).
2. **Every commit needs a tag.** Before running `git commit`, decide: is this
   `[INFRA]` (CI, docs, tooling, docker, dependency bumps unrelated to a
   feature), `[BACKEND]` (`apps/api`, `apps/worker`, `apps/scheduler`,
   `apps/webhook`, `apps/cli`, any `packages/*`, any `providers/*`), or
   `[FRONTEND]` (`apps/web`)?
3. **Never push to `main`.** If asked to "deploy" or "ship to production",
   that means: get `development` green → let/help the promotion PRs open →
   stop and ask before merging the `staging → main` PR, unless the user
   explicitly authorized an autonomous merge to production in that request.
4. **Verify clean, not cached.** Turbo's cache can hide real breakage (this
   bit us once this session — a broken `tsconfig.base.json` change passed
   locally because of stale `dist/` folders, but failed in CI's clean
   checkout). Before trusting a green local run, prefer `pnpm <task> --force`
   after clearing `.turbo` and any `dist/` folders you're unsure about, or
   just trust CI's checkout over your local one when they disagree.
5. **Don't `rm -rf` glob patterns you haven't dry-run.** A malformed
   `providers/*/  .turbo` glob deleted an entire tracked directory once this
   session (recovered cleanly via `git restore` since it was tracked — but it
   didn't have to be safe). Delete specific, explicit paths one at a time
   when cleaning build artifacts.

## Related docs

- [`docs/[CURRENT].BRANCHING_STRATEGY.md`](./docs/[CURRENT].BRANCHING_STRATEGY.md) —
  environment-per-branch deployment details
- [`docs/[IN_DEV].GITHUB_SETUP_CHECKLIST.md`](./docs/[IN_DEV].GITHUB_SETUP_CHECKLIST.md) —
  full checklist this policy implements
- [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md) — infra/ops reference (dev setup,
  monitoring, Docker, CI/CD pipeline stages)
