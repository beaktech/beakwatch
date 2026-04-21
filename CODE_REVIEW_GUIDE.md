# Code Review Guide (Frontend / React)

When the user asks for a code review, read every source file under `src/` (or the project's equivalent source root), plus config files at the repository root (`package.json`, `tsconfig.json`, `vite.config.*`, `next.config.*`, etc.) and any agent-instruction markdown (`CLAUDE.md`, `README.md`, `AGENTS.md`). Skip `node_modules/`, lockfiles, build output, generated types, and static assets in `public/` unless something specific points you there.

Produce a written report as `REVIEW.md` at the repository root. **Do not fix anything unless explicitly asked — report only.**

Agent-instruction files are in scope for review. If described component hierarchies, state flows, or styling patterns don't match the code, report that as documentation drift.

## Before you start

Understand the architecture before you judge it. Is this Atomic Design? Feature-based folders? Centralized state (Redux / Zustand / Jotai) or Context? Server components or purely client-side? The patterns that are "wrong" in one architecture are idiomatic in another.

**Confirm issues by checking the component tree before flagging.** Before calling a prop unused, check if it's passed via spread (`{...props}`) or consumed by a higher-order component or wrapper. Before calling a CSS class dead, grep for dynamic string construction (`` className={`btn-${status}`} ``) and template-literal keys in a styles object. False positives erode trust in the whole report.

## What to look for

### Correctness & React Patterns

- **Hooks rules.** Hooks called inside loops, conditions, or nested functions.
- **Dependency arrays.** Missing or unnecessary deps in `useEffect`, `useMemo`, `useCallback` leading to stale closures or infinite re-render loops. Objects/arrays/functions recreated every render and used as deps are a common cause.
- **State mutation.** Direct mutation of state objects or arrays instead of returning new references. Especially common with nested state.
- **Key props.** Missing keys, or unstable keys like array index on a list that can be reordered, filtered, or have items inserted.
- **Effects that should be event handlers.** Logic that runs "in response to an event" tucked inside `useEffect` with a dependency that represents the event. If it should happen *because the user did something*, it belongs in the handler, not an effect.
- **Non-lazy state initializers.** `useState(expensiveCalc())` runs `expensiveCalc()` every render. `useState(() => expensiveCalc())` runs it once. Flag the former when the initializer is non-trivial.
- **Refs read or written during render.** Reading `ref.current` during render is a bug waiting to happen; refs are for effects and event handlers.

### Performance

- **Unnecessary re-renders.** Large components that re-render on every parent update and should be split or memoized.
- **Expensive computations in the render body** not wrapped in `useMemo`.
- **Closure churn.** Functions recreated every render and passed to memoized children, defeating the memoization.
- **Bundle weight.** Barrel imports that pull in entire libraries, or heavy dependencies where a tree-shakable or smaller alternative exists. Flag any single dep contributing disproportionate weight.

### Accessibility & UX

- **Semantic HTML.** `<div onClick>` for things that should be `<button>`. `<a>` without `href` for things that should be links.
- **ARIA.** Missing `aria-label` on icon-only buttons, missing `alt` on images (empty `alt=""` is fine for decorative), improper `role` usage.
- **Keyboard navigation and focus management.** This is where most real-world a11y bugs live. Modals that don't trap focus or don't return focus on close. Custom dropdowns, tabs, or menus that don't respond to arrow keys, Home/End, or Escape. Route changes that don't move focus. Skip links missing.
- **Forms.** Missing `<label>` associations, wrong input types (`text` instead of `email`/`tel`/`number`), missing loading and error states, no inline validation feedback.
- **Motion.** Animations that ignore `prefers-reduced-motion`. Lower priority than the above but worth a mention.

### Security (frontend-specific)

- **`dangerouslySetInnerHTML`** fed by anything that isn't clearly a trusted source. Flag even if it looks fine — worth calling out for the author to verify.
- **`target="_blank"` without `rel="noopener noreferrer"`** on external links.
- **Environment variables** that shouldn't be in the client bundle. Anything `VITE_*`, `NEXT_PUBLIC_*`, or `REACT_APP_*` ships to users — flag if it looks like a secret.
- **User input** rendered into URLs, HTML, or passed to `eval`-like APIs without sanitization.

### Dependencies (extra important for open-source release)

- **Outdated or unmaintained packages** — especially anything with no release in 2+ years or known CVEs.
- **Bloat** — libraries included for a single small utility that could be replaced with 20 lines.
- **License check** — note any GPL/AGPL deps if the project is intended for permissive open-source release.
- **Peer dependency mismatches** in `package.json`.

### Documentation & Architecture Drift

- **Stale types or PropTypes** that don't match actual component props.
- **README / Storybook drift** — documented components, props, or example code that has been renamed, removed, or changed shape.
- **Agent-instruction drift** — `CLAUDE.md` or equivalent describing patterns, file locations, or conventions that no longer match the code.

### Code Quality & Style

- **Inconsistent styling patterns** — mixing inline styles, CSS modules, Tailwind, and CSS-in-JS without a clear reason.
- **Hardcoded UI strings** that should live in an i18n file or constants module, especially if the project claims to support multiple locales.
- **Prop drilling** through 4+ layers of components that don't use the data — suggest Context or a state store.

Group minor lint-style nits (`let` vs `const`, import ordering, trivial naming) into a single summary entry rather than listing each one.

### Test Coverage

- **Branching logic without branch coverage.** Flag components with conditional rendering, multiple render paths based on props/state, or non-trivial logic where the tests don't cover the branches. "Has complex logic and no tests" is too subjective — tie it to specific untested branches.
- **Critical user flows without integration tests.** Checkout, login, signup, anything the product can't work without.
- **Shallow assertions.** Tests that assert "component renders" without asserting it renders the *correct data* or responds correctly to interaction.

## How to report

For each issue, include:

- **File and approximate line number.**
- **Category** (Correctness, Performance, A11y, State Management, Security, Dependencies, Docs, Style, Tests).
- **What's wrong and why** — be specific. Not "bad dependency array" but "this `useEffect` re-runs every render because `config` on line 23 is an object literal recreated each time; memoize it or lift it out."
- **Severity:**
  - **High** — bugs, render loops, security issues, broken critical flows.
  - **Medium** — a11y gaps, meaningful performance problems, missing tests on critical paths.
  - **Low** — style, naming, minor docs drift.

Prioritise Correctness, Performance, and Security. Lead the report with High severity issues so they don't get lost.

Include a **"Not Issues"** section for patterns that look wrong but are intentional — e.g., "Intentional prop drilling kept for component simplicity," "Deliberate `dangerouslySetInnerHTML` for sanitized CMS content," "Index keys acceptable here because the list is static and never reorders." This prevents the author from wasting time defending choices you already understood.

End with a brief **Summary** — overall health, top 3 things to fix before open-sourcing, and anything that's genuinely good and worth preserving.
