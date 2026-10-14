# PDF Toolkit

A free, privacy-first PDF toolkit in development. **Merge PDF and Split PDF are available** and run locally in your browser. Rotate and delete pages remain **Coming soon**.

## Requirements and quick start

Use Node.js **24 LTS** and npm **11 or newer**. .nvmrc selects Node 24. Install Node from its official distribution if npm is missing; this project needs no environment variables or credentials.

```sh
git clone https://github.com/ChornyjKvas/pdf-toolkit.git
cd pdf-toolkit
git switch feat/pdf-split
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173), then choose a tool. Once these features reach main, the branch-switch command is unnecessary.

## Merge PDF

1. Open /#/merge-pdf and choose two or more PDFs, or drop them into the selection area.
2. Review each filename, size, and page count. Remove any files marked Not ready.
3. Use Up and Down to arrange documents. Every source page is copied in its original sequence.
4. Select Merge PDFs, then Download merged.pdf.

You can add more files, remove files, reorder, merge again, or Clear all. Any selection/order change invalidates the previous result. Download URLs are revoked on changes, repeated merges, and when leaving the page.

Actual PDF parsing validates selections, beyond filename/MIME checks. Empty files, non-PDFs, malformed/unsupported documents, encrypted/password-protected PDFs, and PDFs with zero pages are rejected with messages. At least two valid PDFs and no invalid entries are required to merge. File actions are locked during validation/merging to avoid stale results and double submissions.

Above **50 MiB total** a warning is shown. This is a warning threshold, not a size cap or a guarantee that smaller PDFs will work. Memory use can substantially exceed input size; very large or complex PDFs may slow or exhaust the browser, especially on mobile. Recoverable failures show a retry message. A browser tab terminated by the operating system cannot display an error. Processing currently runs on the main thread and can briefly block interaction. There is no PDF preview, password entry, repair, or support guarantee for document-level forms, signatures, bookmarks, and other advanced PDF features. The operation copies pages into a new PDF, rather than preserving every document-level feature.

Use a modern browser supporting File.arrayBuffer, Blob, object URLs, and local downloads. Mobile download location/behavior varies by browser. Drag-and-drop is optional; the native multi-file picker is available for keyboard and mobile use.

## Split PDF

1. Open /#/split-pdf and choose or drop **one** source PDF. Its full name, size, and page count are shown after actual parsing.
2. Choose **Extract pages to one PDF** (default) or **Split into separate files**.
3. Enter page numbers/ranges, then select Extract pages or Create separate PDFs.
4. Download the resulting PDF(s) individually.

Ranges use 1-based pages and allow spaces around commas/hyphens. Examples:

| Input | Extract mode | Separate files mode |
| --- | --- | --- |
| `1-3` | One PDF with pages 1,2,3 | One PDF with pages 1,2,3 |
| `2,5,7-9` | One PDF with pages 2,5,7,8,9 | Three PDFs: page 2; page 5; pages 7,8,9 |
| `5,2-3` | One PDF in the order 5,2,3 | Two PDFs: page 5; pages 2,3 |

Empty expressions, duplicate/overlapping pages, zero/negative/non-integer pages, descending ranges, and out-of-bounds selections are rejected inline. Singleton ranges such as 2-2 are accepted and normalized to 2. Separate files mode allows **at most 30 groups per operation**; this is a practical output-count limit to reduce accidental memory spikes. Extract mode does not have a 30-segment cap. Original page dimensions and rotation are copied.

Downloads are named `<source-basename>-extracted.pdf` or `<source-basename>-pages-1-3.pdf`. Unsafe filename characters are replaced and very long basenames are shortened to 120 characters. **ZIP downloads are deferred**; each link downloads one PDF, not a ZIP. No thumbnails, password handling, PDF repair, or guarantee for advanced document-level features is included.

Replacing or clearing the source resets ranges, errors, mode, and downloads. Changing ranges or mode also invalidates old downloads. All Blob URLs are revoked on invalidation, reprocessing, or navigation. No outputs are published unless every requested PDF succeeds; partially allocated URLs are cleaned up on failure. Late asynchronous completions after replacement, clearing, or navigation cannot publish stale results. File replacement/clearing can interrupt validation; conflicting actions are disabled during output generation.

Split reuses the **50 MiB** large-file warning threshold. It is not a size cap or a promise of safe memory usage. Very large or complex sources or outputs may exhaust memory; use fewer output groups or a smaller PDF. Browser/OS termination of a tab cannot be caught by the UI. Processing remains on the main thread, with coarse busy status rather than a fabricated percentage. Modern File.arrayBuffer, Blob, object URLs, and local downloads are required; mobile download behavior varies.

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
- src/pages: homepage, Merge and Split PDF UIs, two tool placeholders, and 404 page.
- src/lib/tools.ts: planned tool metadata.
- src/lib/pdf: pure merge/split/inspection functions, 1-based range parser, controlled errors, and local file validation helpers.
- src/styles: Tailwind CSS with the official Vite plugin and small custom styles.
- src/test and src/lib/pdf/*.test.ts: route, navigation, range validation, UI lifecycle, PDF ordering, failure, and cleanup tests using synthetic in-memory documents.
- docs/ROADMAP.md: next milestones.

React + TypeScript + Vite power the app. React Router uses **hash routing** so deep links work on static hosts without rewrite rules: /#/merge-pdf, /#/split-pdf, /#/rotate-pdf, and /#/delete-pdf. Unknown hash routes show the app's 404 page. The route paths are /merge-pdf, /split-pdf, /rotate-pdf, and /delete-pdf inside the router. A direct server URL such as /merge-pdf is not a supported deep link on a host without rewrites. Relative build assets support hosting under a repository subdirectory. Deployment is not configured.

## Privacy and future PDF work

Merge and Split PDF read File.arrayBuffer locally and use pdf-lib to copy pages into output bytes. Local Blob URLs provide downloads; there is no document upload request, document persistence, or application logging of document contents/filenames. Input File references are released when removed, replaced, cleared, or the page unmounts. Operation tokens prevent late asynchronous results from publishing after navigation. Future tools must follow the same local-processing and cleanup principles. PDF.js is deferred until previews are needed.

No backend, database, authentication, payments, advertising, analytics, AI API, or uploaded-document storage is included. Automated tests verify page counts, dimensions, source order, rotation, invalid/encrypted/zero-page inputs, and the merge UI. Use synthetic documents for manual testing; never commit personal PDFs.

## License

No project license has been chosen by the owner. Public visibility does not grant a general license to reuse, modify, or redistribute this project's code. Dependency licenses are separate. Choose a license before distributing the project as open source.
