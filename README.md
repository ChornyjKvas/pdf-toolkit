# PDF Toolkit

A free, privacy-first PDF toolkit in development. **Merge PDF is available** and runs locally in your browser. Split, rotate, and delete pages remain **Coming soon**.

## Requirements and quick start

Use Node.js **24 LTS** and npm **11 or newer**. .nvmrc selects Node 24. Install Node from its official distribution if npm is missing; this project needs no environment variables or credentials.

```sh
git clone https://github.com/ChornyjKvas/pdf-toolkit.git
cd pdf-toolkit
git switch feat/pdf-merge
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173), then choose Merge PDF. Once the merge feature reaches main, the branch-switch command is unnecessary.

## Merge PDF

1. Open /#/merge-pdf and choose two or more PDFs, or drop them into the selection area.
2. Review each filename, size, and page count. Remove any files marked Not ready.
3. Use Up and Down to arrange documents. Every source page is copied in its original sequence.
4. Select Merge PDFs, then Download merged.pdf.

You can add more files, remove files, reorder, merge again, or Clear all. Any selection/order change invalidates the previous result. Download URLs are revoked on changes, repeated merges, and when leaving the page.

Actual PDF parsing validates selections, beyond filename/MIME checks. Empty files, non-PDFs, malformed/unsupported documents, encrypted/password-protected PDFs, and PDFs with zero pages are rejected with messages. At least two valid PDFs and no invalid entries are required to merge. File actions are locked during validation/merging to avoid stale results and double submissions.

Above **50 MiB total** a warning is shown. This is a warning threshold, not a size cap or a guarantee that smaller PDFs will work. Memory use can substantially exceed input size; very large or complex PDFs may slow or exhaust the browser, especially on mobile. Recoverable failures show a retry message. A browser tab terminated by the operating system cannot display an error. Processing currently runs on the main thread and can briefly block interaction. There is no PDF preview, password entry, repair, or support guarantee for document-level forms, signatures, bookmarks, and other advanced PDF features. The operation copies pages into a new PDF, rather than preserving every document-level feature.

Use a modern browser supporting File.arrayBuffer, Blob, object URLs, and local downloads. Mobile download location/behavior varies by browser. Drag-and-drop is optional; the native multi-file picker is available for keyboard and mobile use.

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
- src/pages: homepage, Merge PDF UI, three tool placeholders, and 404 page.
- src/lib/tools.ts: planned tool metadata.
- src/lib/pdf: pure merge/inspection functions, controlled errors, and local file validation helpers.
- src/styles: Tailwind CSS with the official Vite plugin and small custom styles.
- src/test and src/lib/pdf/merge.test.ts: route, navigation, UI lifecycle, PDF ordering, error, and cleanup tests using synthetic in-memory documents.
- docs/ROADMAP.md: next milestones.

React + TypeScript + Vite power the app. React Router uses **hash routing** so deep links work on static hosts without rewrite rules: /#/merge-pdf, /#/split-pdf, /#/rotate-pdf, and /#/delete-pdf. Unknown hash routes show the app's 404 page. The route paths are /merge-pdf, /split-pdf, /rotate-pdf, and /delete-pdf inside the router. A direct server URL such as /merge-pdf is not a supported deep link on a host without rewrites. Relative build assets support hosting under a repository subdirectory. Deployment is not configured.

## Privacy and future PDF work

Merge PDF reads File.arrayBuffer locally and uses pdf-lib to copy pages into output bytes. A local Blob URL provides the download; there is no document upload request, document persistence, or application logging of document contents/filenames. Input File references are released when removed, cleared, or the page unmounts. Operation tokens prevent late asynchronous results from publishing after navigation. Future tools must follow the same local-processing and cleanup principles. PDF.js is deferred until previews are needed.

No backend, database, authentication, payments, advertising, analytics, AI API, or uploaded-document storage is included. Automated tests verify page counts, dimensions, source order, rotation, invalid/encrypted/zero-page inputs, and the merge UI. Use synthetic documents for manual testing; never commit personal PDFs.

## License

No project license has been chosen by the owner. Public visibility does not grant a general license to reuse, modify, or redistribute this project's code. Dependency licenses are separate. Choose a license before distributing the project as open source.
