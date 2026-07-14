# design-sync NOTES — Alfabra Vector frontend

Repo-specific gotchas for future syncs of this design system.

## Shape & layout
- This is a **Next.js 14 app**, not a published component library. There is **no `dist/`** — the bundle is built in synth mode from a curated barrel: `.design-sync/ds-entry.tsx` (passed via `--entry`).
- Deps are **hoisted to the repo-root `node_modules`** (npm workspace; `frontend/node_modules` is sparse). Always pass `--node-modules <repo-root>/node_modules`.
- Run all converter commands from the **`frontend/` directory** (cwd), where `.design-sync/`, `.ds-sync/`, and `ds-bundle/` live.

## Scope
- Synced set = the 7 self-contained primitives: Button, Badge, Input, Footer, ChatInput, FileUploadArea, TaskPanel.
- **Header and Sidebar are intentionally excluded.** They are app-shell components tightly coupled to `AuthProvider`/`useAuth`, `apiClient` (live network health-checks), `useTheme`, `next/link`, `next/navigation`, `framer-motion`, and feature code (`ConversationList`). They cannot render standalone and would pull app infrastructure into the DS bundle. Re-adding them would require heavy provider/router/API stubbing.

## CSS pipeline (the important part)
- Styling is **Tailwind CSS v3**, including custom component classes defined via `@apply` in `src/styles/globals.css` (`btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `card-alfabra`, `table-alfabra`, `input-alfabra`, `label-alfabra`, `heading-font`).
- Tailwind must be **compiled to a static stylesheet** before the converter runs — the converter does not run Tailwind. Compile command (from `frontend/`):
  ```sh
  node ../node_modules/tailwindcss/lib/cli.js -c .design-sync/tailwind.ds.cjs -i .design-sync/ds-input.css -o .design-sync/compiled.css
  ```
- Input is `.design-sync/ds-input.css` (a wrapper that prepends the Inter webfont `@import`, then `@import`s the real `src/styles/globals.css`). globals.css is a pre-existing project file and is never modified.
- The safelist regex in `tailwind.ds.cjs` MUST stay anchored (`^...$`) — an unanchored token pattern also matches `placeholder-`/`via-`/`to-` color utilities and explodes the sheet from ~120 KB to ~2.7 MB.
- `.design-sync/tailwind.ds.cjs` reuses the app's real theme (`../tailwind.config.js`) but overrides `content` to scan all of `src/**` + `.design-sync/previews/**` (realistic utility surface) and **safelists** the brand token utilities + custom component classes so the design agent can use them even where the 7 components don't.
- `cfg.cssEntry` points at `.design-sync/compiled.css`; the converter copies it to `_ds_bundle.css` and `styles.css` `@import`s it.
- Color tokens use the RGB-triple pattern `rgb(var(--x) / <alpha-value>)` (see globals.css / tailwind.config.js, issue #109). Both light (`:root`) and dark (`.dark`) themes are defined.

## Known render warns (expected — not new)
- `[FONT_REMOTE] "Inter"` — the Inter webfont is loaded via a remote `@import` (see font decision). Expected on every validate; do not chase.
- `tokens: N missing (below threshold)` — a few `var(--*)` referenced by utilities without a matching definition; non-blocking.

## Re-sync risks
- **`.design-sync/compiled.css` is a build artifact** (gitignored is NOT — it's committed as a durable input? No: it is regenerated). Regenerate it (compile command above) whenever component classes or globals.css change, BEFORE running the converter. A stale compiled.css silently ships wrong styling. NOTE: compiled.css is currently committed as the `cssEntry`; if you prefer, gitignore it and always regenerate — but then every re-sync MUST recompile first.
- Tailwind purges unused classes; the safelist in `tailwind.ds.cjs` is the only guarantee the token/component classes ship. If a new token or component class is added to the DS, add it to the safelist.
- **Previews depend on upstream component APIs.** The authored `.design-sync/previews/*.tsx` pass real props; if a component's props change (e.g. Button variant names), update its preview and re-grade.
- **`dtsPropsFor` is hand-maintained** — the component `.tsx` sources aren't in the ts-morph project in synth mode, so props come from `cfg.dtsPropsFor`, not auto-extraction. If a component's real interface changes, update `dtsPropsFor` to match or the agent's contract goes stale.
- Build is synth-entry from `.design-sync/ds-entry.tsx`; if a new primitive is added to the DS, add it to the barrel, `componentSrcMap`, `dtsPropsFor`, a `docs/` category stub, and a `previews/` file.
- **Font decision (Inter):** the app uses Inter via `next/font/google` (`var(--font-inter)`), injected at runtime — no woff2 ships with the app and none is cached locally. Resolved by loading Inter from Google Fonts via an `@import` at the top of `ds-input.css` (the same source next/font uses). This is the real brand font, not a substitute; it loads at runtime in claude.ai/design (a live web app). The local headless render check may show a fallback font if it has no network — that does not affect what ships. If a fully offline/self-contained bundle is later required, drop Inter woff2 files under `.design-sync/` and switch to `cfg.extraFonts` + a local `@font-face`.
