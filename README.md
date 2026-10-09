# project-buddy

project-buddy is a personal Next.js site that teaches Blender, the open-source 3D creation suite.

## Development

Node is pinned to 24 via `mise.toml`. Run `mise install` once, then use mise shell activation or prefix commands with `mise exec --`.

```bash
npm install          # install dependencies
npm run dev          # start the dev server at http://localhost:3000
npm test             # run unit tests once (Vitest)
npm run test:watch   # run unit tests in watch mode
npm run lint         # lint with ESLint
npm run typecheck    # type-check with tsc --noEmit
npm run format       # format with Prettier (writes files)
npm run format:check # verify formatting without writing
npm run check        # lint, typecheck, format:check, then test; stops at the first failure
npm run build        # production build
```

Prettier sorts Tailwind classes via `prettier-plugin-tailwindcss`, and `eslint-config-prettier` turns off ESLint rules that would conflict with it. Run `npm run check` before committing.
