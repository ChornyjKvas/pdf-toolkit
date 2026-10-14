# PDF Toolkit

A free, privacy-first PDF toolkit in development. This frontend foundation includes a responsive homepage and four **Coming soon** tool pages. There is currently **no file upload or PDF processing functionality**.

## Requirements and quick start

Use Node.js **24 LTS** and npm **11 or newer**. .nvmrc selects Node 24. Install Node from its official distribution if npm is missing; this project needs no environment variables or credentials.

```sh
git clone https://github.com/ChornyjKvas/pdf-toolkit.git
cd pdf-toolkit
git switch feat/frontend-foundation
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). Once the foundation PR is merged, the branch-switch command is unnecessary.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Reproduce the committed dependency lockfile |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Strict TypeScript checks for app and configuration |
| `npm test` | Run Vitest tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Typecheck and create the production build in dist/ |
| `npm run preview` | Preview the production build locally |

## Structure and routing

- src/components: shared layout, navigation, and route-change focus management.
- src/pages: homepage, tool placeholders, and 404 page.
- src/lib/tools.ts: planned tool metadata.
- src/lib/pdf: documented boundaries for future pure PDF functions.
- src/styles: Tailwind CSS with the official Vite plugin and small custom styles.
- src/test: route, navigation, and privacy-copy tests using Vitest, jsdom, and React Testing Library.
- docs/ROADMAP.md: next milestones.

React + TypeScript + Vite power the app. React Router uses **hash routing** so deep links work on static hosts without rewrite rules: /#/merge-pdf, /#/split-pdf, /#/rotate-pdf, and /#/delete-pdf. Unknown hash routes show the app's 404 page. The route paths are /merge-pdf, /split-pdf, /rotate-pdf, and /delete-pdf inside the router. A direct server URL such as /merge-pdf is not a supported deep link on a host without rewrites. Relative build assets support hosting under a repository subdirectory. Deployment is not configured.

## Privacy and future PDF work

All document processing in subsequent tasks must happen locally in the browser. Document contents must not be uploaded or logged. Future operations must handle invalid files gracefully and clean up browser resources. pdf-lib is installed but no PDF operation is implemented; PDF.js is deferred until previews are needed. The homepage's local-files statement describes this planned architecture, not existing processing features.

No backend, database, authentication, payments, advertising, analytics, AI API, or uploaded-document storage is included. Current checks cover the frontend foundation; they do not validate PDF operations.

## License

No project license has been chosen by the owner. Public visibility does not grant a general license to reuse, modify, or redistribute this project's code. Dependency licenses are separate. Choose a license before distributing the project as open source.
