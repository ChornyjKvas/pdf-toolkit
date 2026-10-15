# PDF Toolkit

A free, privacy-first PDF toolkit in development. **Merge PDF, Split PDF, Rotate PDF, Delete Pages, and Organize PDF are available** and run locally in your browser.

The compact homepage puts the five working tools first, with a centered grid and local-processing information below. There are no format-conversion tools in this release. See docs/TOOL_CATALOG.md for the typed catalog and availability gate for future tools.

## Requirements and quick start

Use Node.js **24 LTS** and npm **11 or newer**. .nvmrc selects Node 24. Install Node from its official distribution if npm is missing; this project needs no environment variables or credentials.

```sh
git clone https://github.com/ChornyjKvas/pdf-toolkit.git
cd pdf-toolkit
git switch feat/compact-homepage
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

## Rotate PDF

1. Open /#/rotate-pdf and choose or drop **one** PDF. Review its filename, size, and validated page count.
2. Keep **All pages** (default), or choose **Selected pages** and enter ranges such as `1,3-5` or `5,2-3`.
3. Choose **90° clockwise**, **180°**, or **90° counterclockwise**.
4. Select Rotate PDF, then download `<source-basename>-rotated.pdf`.

Rotation is **relative** to each page's existing angle, modulo 360. Existing 90° + clockwise 90° becomes 180°; existing 270° + clockwise 90° becomes 0°; existing 90° + counterclockwise 90° becomes 0°. Counterclockwise 90° is equivalent to clockwise 270°.

Selected-page expressions reuse Split's validation: spaces and singleton ranges are allowed; empty, malformed, duplicate, overlapping, descending, zero/negative, and out-of-bounds selections are rejected. Selection identifies target pages and **never reorders the document**. All pages, their original order, dimensions, and content streams are retained; only target rotations are changed. Saving does not regenerate form appearances. Preservation of every advanced PDF feature or signature is not guaranteed by pdf-lib.

Every operation reads the original selected source again, so repeated clicks do not cumulatively rotate prior output. To rotate a downloaded result again, choose that file as the source. Changing source, mode, range, or direction invalidates the previous result and revokes its Blob URL. Reprocessing and navigation also revoke stale URLs. Options, source selection, and clear are disabled during validation/processing, and late completions after navigation are ignored.

Empty, malformed/unsupported, encrypted/password-protected and zero-page PDFs are rejected using shared validation. Read/save/processing failures show an error without a download. The existing **50 MiB warning** is not a safe maximum: large/complex PDFs may exhaust memory or temporarily stall the browser. Processing is on the main thread; browser/OS termination cannot be caught by the UI. No thumbnails, PDF.js, repair, password handling, or additional dependencies are included. Browser download compatibility follows the same modern-browser requirements as Merge and Split.

## Delete Pages

1. Open /#/delete-pdf and choose or drop **one** PDF. Review its filename, size, and detected page count.
2. Enter **Pages to delete**, for example `2,4-6` or `1-3`. Page numbers start at 1; spaces around commas/hyphens are allowed.
3. Review the live removal/retention summary, then select Delete pages.
4. Download `<source-basename>-pages-removed.pdf`.

An explicit valid selection is required. Empty, malformed, duplicate, overlapping, descending, zero/negative, and out-of-bounds selections are rejected through the shared range parser. **At least one page must remain**, enforced in both UI and PDF operation; deleting every page, including the only page of a one-page PDF, is refused. No blank page is inserted to replace an empty result.

The operation creates a new PDF by copying retained pages in their original sequence, preserving their tested content streams, dimensions, and rotation. It does not delete source indices in place, so index shifts cannot alter the selection. Document-level metadata, forms, bookmarks, attachments, and signatures are not guaranteed to survive this page-copy workflow. PDF editing must not be treated as preserving signature validity.

Each operation reads the originally selected source again, not a previous edited output. Changing source/ranges, clearing, reprocessing, and navigation invalidate prior downloads and revoke Blob URLs. Busy controls prevent double submissions and conflicting changes; late completions after navigation cannot publish stale results. Source validation and read/save/processing failures follow the same controlled-error patterns as other tools. Output names use the shared safe-basename helper.

The **50 MiB warning** is a convention, not a guaranteed safe maximum or size cap. Large or complex PDFs can exhaust memory or stall the main thread; browser/OS tab termination cannot be caught by the UI. No thumbnails, PDF repair, password handling, PDF.js, or new dependencies are included. Modern browser file/Blob/download support is required, and mobile download behavior varies.

## Organize PDF

1. Open /#/organize-pdf and select or drop one PDF.
2. Review thumbnails, source page identifiers and current positions. Use Earlier/Later to reorder, including across groups; moving across a boundary follows the moved page.
3. Rotate any page clockwise/counterclockwise by 90 degrees, or Remove it. At least one page must remain.
4. Undo restores the most recent edit, including removal. Reset changes restores every original page and angle.
5. Download organized PDF creates a safely named source-basename-organized.pdf in visual order. A fallback download link remains available.

Rotations are relative to original PDF angles, modulo 360. Edits, replacement, clear, reprocessing and navigation revoke old download URLs; stale completions cannot publish results. Controls lock during validation/export. Copying source pages preserves tested geometry, crop boxes and content; advanced forms, bookmarks, metadata and signatures are not guaranteed to survive.

PDF.js **6.4.299** is pinned for previews only; pdf-lib remains the exporter. Vite bundles the local worker through its URL import. Configuration copies installed cMaps, standard fonts, WASM, ICC data and license into ignored public/pdfjs/ for local hosting. No CDN or document URL is used. The organizer route is lazy-loaded.

Pagination mounts at most **six canvases**, with a FIFO queue limited to **two render tasks**. Thumbnails fit 220 by 260 CSS pixels with device-pixel ratio capped at 1.5. Orientation is preserved in a consistent preview frame. Pagination, rotation and removal cancel abandoned render tasks and clear canvas backing stores. Replacement/clear/navigation abort the loading task and destroy the PDF.js session. A failed page preview has an individual placeholder; document-level preview failure still permits controls/export.

Pointer drag-to-reorder is deferred; move buttons support mouse, touch and keyboard. The 50 MiB warning is not a safe maximum. Pagination bounds raster allocation, not total parser memory; complex documents can still exhaust memory. Export uses the main thread. Password handling, repair and universal advanced-feature preservation remain unsupported.

## Continuous integration

.github/workflows/ci.yml runs the locked install, lint, strict typecheck, all tests, production build and required PDF asset checks on PRs and main pushes using Node 24. It has read-only repository permissions and no deployment steps. Check the actual Actions conclusion; local results and missing checks are not CI success. Required status checks remain an owner-controlled setting. See docs/RELEASE_CHECKLIST.md for integration and launch gates.

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
- src/pages: homepage, all five PDF tool UIs, and 404 page.
- src/lib/tools.ts: planned tool metadata.
- src/lib/pdf: pure merge/split/rotate/delete/organize/inspection functions, shared 1-based range parser, controlled errors, and local file validation helpers.
- src/lib/preview: local PDF.js adapter and bounded render queue.
- src/styles: Tailwind CSS with the official Vite plugin and small custom styles.
- src/test and src/lib/pdf/*.test.ts: route, navigation, range validation, UI lifecycle, PDF ordering, failure, and cleanup tests using synthetic in-memory documents.
- docs/ROADMAP.md: next milestones.
- docs/RELEASE_CHECKLIST.md: verified static-host requirements, ordered merge plan, owner launch decisions, regression checks and rollback.

React + TypeScript + Vite power the app. React Router uses **hash routing** so deep links work on static hosts without rewrite rules: /#/merge-pdf, /#/split-pdf, /#/rotate-pdf, /#/delete-pdf, and /#/organize-pdf. Unknown hash routes show the app's 404 page. The route paths are /merge-pdf, /split-pdf, /rotate-pdf, /delete-pdf, and /organize-pdf inside the router. A direct server URL such as /merge-pdf is not a supported deep link on a host without rewrites. Relative build assets support hosting under a repository subdirectory. Deployment is not configured. See docs/RELEASE_CHECKLIST.md before merging or publishing. The build includes dependency licenses in THIRD_PARTY_NOTICES.txt and PDF.js support-asset license files.

## Privacy and future PDF work

All five tools read File.arrayBuffer locally and use pdf-lib to process output bytes. Local Blob URLs provide downloads; there is no document upload request, document persistence, or application logging of document contents/filenames. Input File references are released when removed, replaced, cleared, or the page unmounts. Operation tokens prevent late asynchronous results from publishing after navigation. Future tools must follow the same local-processing and cleanup principles. Organize PDF lazily loads PDF.js for local previews; the other tools do not render thumbnails.

No backend, database, authentication, payments, advertising, analytics, AI API, or uploaded-document storage is included. Automated tests verify page counts, dimensions, source order, rotation, invalid/encrypted/zero-page inputs, and the merge UI. Use synthetic documents for manual testing; never commit personal PDFs.

## License

No project license has been chosen by the owner. Public visibility does not grant a general license to reuse, modify, or redistribute this project's code. Dependency licenses are separate. Choose a license before distributing the project as open source.
