# Release readiness and owner checklist

This document prepares a release; it does not authorize merging or deployment.
All five tools are on the feature stack. The project has no chosen license,
published support policy, or activated deployment configuration.

## Build and local verification

Use Node 24 LTS and npm 11 or newer in a fresh checkout of the reviewed tip:

```sh
npm ci
npm audit
npm run lint
npm run typecheck
npm test
npm run build
npm run preview -- --host 127.0.0.1
git diff --check
```

Publishable output is the entire `dist/` directory. Do not publish source,
node_modules, test fixtures, reports, or environment files. Preserve the worker,
`pdfjs/` support assets and their bundled licenses, plus `THIRD_PARTY_NOTICES.txt`.
The build generates notices from installed non-optional production dependencies
and fails if a package has no root license/notice file. This is a practical notice
inventory, not a legal certification; review bundled worker/support-asset licenses
before distribution. Do not replace or remove required third-party notices.

## Static host recommendation

GitHub Pages is suitable for this repository: the application is static, uses
hash routing, and needs no server functions, credentials or secret build variables.
The intended project URL would be `https://chornyjkvas.github.io/pdf-toolkit/`.
The owner must choose/authorize the host and public launch first. No Pages settings
or deployment workflow have been activated by this audit.

Keep Vite `base: './'`. Relative entry/chunk assets and the bundled worker work
at both `/` and `/pdf-toolkit/` because routes are hash fragments. PDF.js support
URLs resolve from the document's directory, so use the trailing-slash project URL
or `/pdf-toolkit/index.html`, not a slashless document path. A host should redirect
`/pdf-toolkit` to `/pdf-toolkit/`. Deep links are `/pdf-toolkit/#/organize-pdf`,
not `/pdf-toolkit/organize-pdf`. No SPA rewrite is necessary for hash routes.

Locally mount the *same* dist directory at `/pdf-toolkit/` in an ordinary static
server before release. Open every tool, refresh a hash deep link, and load a PDF
in Organize. Confirm local requests for the worker, font/cMap/WASM/ICC files
return 200 with suitable types (JS as JavaScript, WASM as application/wasm).
Check root hosting too if changing `base` or preview URL construction later.
Official references: https://vite.dev/guide/static-deploy.html and
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

For a host with configurable headers, revalidate HTML and unversioned `pdfjs/`
support files; long-lived immutable caching is appropriate for hashed `assets/`
files. GitHub Pages controls its own cache headers: do not promise custom cache
policy there. Publish each dist directory as one complete version and keep the
previous successful artifact for rollback. Test a reload and a fresh/private tab
after release so stale HTML cannot mask missing new chunks.

## Ordered merge plan — do not execute without approval

Prefer merge commits for this stack so existing commit ancestry remains intact.
Squashing/rebasing early PRs requires extra comparison/cherry-pick work and must
not be assumed safe for later PRs. Keep parent branches until the whole stack is
integrated. Before every step, fetch and verify current refs, diff and checks.

1. Review and merge PR #1 (`feat/frontend-foundation` -> `main`).
2. Retarget PR #2 (`feat/pdf-merge`) to `main`; verify its focused diff, then merge.
3. Retarget PR #3 (`feat/pdf-split`) to `main`; verify its focused diff, then merge.
4. Retarget PR #4 (`feat/pdf-rotate`) to `main`; verify its focused diff, then merge.
5. Retarget PR #5 (`feat/pdf-delete-pages`) to `main`; verify its focused diff, then merge.
6. Retarget PR #6 (`feat/pdf-organizer`) to `main`; verify its focused diff, then merge.
7. Retarget the Task 08 PR (`feat/prelaunch-audit`) to `main`; review, re-run checks
   on the final combined tree, then merge only with authorization.

GitHub may retarget children automatically if a base branch is deleted; do not
rely on that behavior or delete branches early. A mergeability flag immediately
after PR creation can be temporary. Fetch again and inspect ancestry/content
before declaring a conflict. Missing CI is not passing CI: the stack currently
has no committed workflow. Adding required CI is recommended before routine
releases, through a separately reviewed change.

## Manual regression checklist

- Keyboard: follow Skip to content; enter every tool from the home card, operate
  the file picker with Enter, tab through options and buttons, use Space/Enter
  for radios/actions, and verify visible focus and route-change focus on main.
- Merge: two labelled PDFs, reorder/remove, merge and reopen the download.
- Split: ordered extraction, separate mode with several links, malformed ranges,
  and a long sanitized filename. At 320px/390px, filenames must wrap, links must
  stay distinguishable and keyboard focus visible. ZIP remains deferred.
- Rotate: relative all/selected-page angles with original rotated pages.
- Delete: invalid ranges and every-page guard; retain at least one page.
- Organize: original IDs vs current positions, per-page previews, rotate/remove,
  Undo/Reset, and correct downloaded visual order. Move the sixth page later
  across a group; focus must remain on an enabled move control. Move a page to
  the final position; focus must switch from disabled Later to enabled Earlier.
- Layout: home and all tools at 1280px, 390px and 320px; include loaded organizer
  cards and multiple Split download links. Assert scrollWidth <= clientWidth.
  Repeat at actual browser zoom 200%, not only a smaller viewport.
- Robustness: malformed/encrypted/empty files, normal labelled pages and a 120+
  page synthetic source. Repeat replacement/clear and navigation during a slow
  operation; no stale output or previous-source thumbnails should appear.
- Observe production requests during selection, processing and download. Only
  static code/support assets should be fetched; source content must not upload.
  Test local worker loading, including under the repository subpath.
- Reopen actual downloads independently; check labels, order, count, rotation,
  geometry and crop boxes. Confirm warnings do not imply signature preservation
  or a guaranteed safe size below 50 MiB.
- Supplement manual checks with axe; review incomplete rules and test with a
  screen reader and physical mobile browsers before claiming broader support.

## Owner decisions and launch gate

The owner must approve the PR merges and final public deployment separately.
Choose a project license (or explicitly retain reserved rights and review the
intended distribution), the static host, and a public support/contact policy.
No email address, response-time promise or legal/privacy certification has been
invented. Current privacy text describes local file processing; static hosting
still involves requests for code/assets and host-controlled request logs.

Hash routes have limited independent crawl/SEO behavior. The app has an HTML
description/favicon and route-specific browser titles; no sitemap, canonical
domain or robots policy is configured. Let the owner choose indexing policy and
final domain before adding them. robots.txt cannot make a public site private.

Release only after the final reviewed tree and browser matrix pass and these
owner decisions are resolved. Keep the prior dist artifact and commit recorded.
Rollback means redeploying that complete artifact, or making a reviewed revert
commit and rebuilding; never force-push or rewrite history to undo a launch.
Verify worker, support assets and downloads again after rollback. There is no
database migration or stored-document recovery step in this application.
