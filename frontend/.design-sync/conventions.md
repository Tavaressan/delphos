# Alfabra Vector — Design System

Industrial/corporate design system for the Alfabra Vector RAG platform (Delphos). Components are the real shipped React code, imported from `window.AlfabraDS.*`. Styling is **Tailwind CSS** with brand tokens as CSS variables.

## Setup (no provider needed)

Components are self-contained — there is **no context provider or theme wrapper to mount**. Just import `styles.css` (it carries the tokens, the Inter webfont, and every component/utility class) and render.

- **Light/dark theme** is class-based: tokens are defined for `:root` (light) and `.dark` (dark). To render dark, put `className="dark"` on any ancestor of your UI. Without it you get the light theme. Never hard-code hex colors — always go through the token utilities below so both themes work.

## Styling idiom — Tailwind + brand tokens

Style with Tailwind utility classes. The brand identity lives in **token color utilities** (backed by CSS variables, theme-aware) and a set of **custom component classes**. Prefer these over raw palette colors (`blue-600`, `slate-200`, …) so designs stay on-brand and theme-correct.

**Token color utilities** — use as `bg-…`, `text-…`, `border-…`, `ring-…`:

| Token | Meaning |
|---|---|
| `primary` (`-dark`, `-light`) | brand blue — primary actions, active nav |
| `secondary` (`-dark`, `-light`) | neutral surfaces / secondary buttons |
| `accent` (`-dark`, `-light`) | cyan accent — highlights, active indicators |
| `success` / `warning` / `danger` (each `-dark`,`-light`) | semantic status |
| `background` / `surface` | page bg / card bg |
| `text-primary` / `text-secondary` | body / muted text (e.g. `text-text-primary`) |
| `border-color` | default borders (e.g. `border-border-color`) |

e.g. `className="bg-surface text-text-primary border border-border-color"`, `className="bg-primary text-white"`, `className="text-accent"`. Use the solid token utilities above (they are guaranteed to ship); avoid inventing arbitrary opacity/color variants that may not be in the stylesheet.

**Custom component classes** (defined in the DS stylesheet — use verbatim):

- Buttons: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`
- Cards: `card-alfabra`
- Tables: `table-container`, `table-alfabra`
- Forms: `input-alfabra` (styled text input), `label-alfabra` (uppercase field label)
- Type: `heading-font` (uppercase tracked headings)

**Fonts**: body/headings use **Inter** (`font-body`, `font-heading`); monospace accents use `font-mono` (buttons, badges, and status text use it deliberately). **Shadows**: `shadow-discrete` (cards), `shadow-card` (hover).

## Where the truth lives

- `styles.css` (→ `_ds_bundle.css`): the full class vocabulary — tokens, component classes, and the compiled utility surface. Read it to confirm a class exists before using it.
- Per-component `<Name>.d.ts` (the props contract) and `<Name>.prompt.md` (usage). Compose components with real props; don't reimplement them.

## Idiomatic snippet

```jsx
const { Button, Badge, Input, TaskPanel } = window.AlfabraDS;

<div className="card-alfabra flex flex-col gap-4 max-w-md">
  <div className="flex items-center justify-between">
    <h3 className="heading-font text-sm text-text-primary">Base de Conhecimento</h3>
    <Badge variant="success">ONLINE</Badge>
  </div>
  <div>
    <label className="label-alfabra">Nome</label>
    <Input placeholder="Ex.: Manuais de manutenção" />
  </div>
  <div className="flex gap-2">
    <Button variant="primary">Salvar</Button>
    <Button variant="ghost">Cancelar</Button>
  </div>
</div>
```
