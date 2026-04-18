# Contributing to DevTab

Thanks for taking the time to contribute! DevTab is a small Chrome new-tab
extension built with Angular, TypeScript, and Tailwind CSS. This document
describes how to get set up, the conventions the project follows, and what to
expect when you open a pull request.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies (the project uses [pnpm](https://pnpm.io/)):

   ```bash
   pnpm install
   ```

   The `prepare` script installs Husky hooks automatically.

3. Run the dev server for quick UI iteration:

   ```bash
   pnpm start
   ```

   Note that browser-extension APIs such as `chrome.storage.local` only behave
   fully when the project is loaded as an unpacked extension. See the README
   for the Chrome install flow.

4. Build the extension into `dist/devtab`:

   ```bash
   pnpm build
   ```

## Development Workflow

- Create a branch off `main` with a short, descriptive name
  (`feat/github-widget`, `fix/credential-reconnect`, etc.).
- Keep commits focused. Small, reviewable commits are preferred over large
  "everything at once" changes.
- Match existing code style — the project uses Prettier + Angular conventions.
  Running Prettier on staged files happens automatically via lint-staged.

### Code Conventions

- **Angular**: standalone components (the v20+ default — do not set
  `standalone: true`), signals for state, `input()` / `output()` functions,
  `ChangeDetectionStrategy.OnPush`, native control flow (`@if`, `@for`,
  `@switch`).
- **TypeScript**: strict mode, prefer type inference where obvious, avoid
  `any` — use `unknown` when the type is genuinely uncertain.
- **Templates**: use `class` / `style` bindings instead of `ngClass` /
  `ngStyle`; keep templates simple and move logic into the component.
- **Services**: `providedIn: 'root'`, single responsibility, `inject()` over
  constructor injection.

### Accessibility

- All UI must pass AXE checks and meet WCAG AA minimums for focus management,
  color contrast, and ARIA attributes.
- Respect `prefers-reduced-motion` for any new animations.

## Checks Before Pushing

Run these locally before opening a PR:

```bash
pnpm typecheck
pnpm test:ci
pnpm lint
```

The pre-commit hook runs `lint-staged`, `pnpm typecheck`, and `pnpm test:ci`
on every commit.

## Pull Requests

- Open the PR against `main`.
- Include a short description of **what** changed and **why**.
- Link any related issue.
- Include screenshots or a short clip for UI changes.
- Keep PRs scoped — unrelated refactors belong in separate PRs.

## Publishing a build

When cutting a release or sharing an unpacked build:

1. Bump `version` in `package.json` and `public/manifest.json` together.
2. Run `pnpm build` and load `dist/devtab` in Chrome as an unpacked extension.
3. Smoke-test settings, refresh, and the dashboard with a real WakaTime credential.

## Reporting Issues

When filing a bug please include:

- DevTab build (branch or commit).
- Chrome version.
- Steps to reproduce.
- Expected vs. actual behaviour.
- Console / network errors if any.

## License

By contributing to DevTab you agree that your contributions will be licensed
under the [MIT License](./LICENSE).
