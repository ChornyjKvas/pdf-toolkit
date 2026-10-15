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

## GitHub Actions quality gate

The workflow is .github/workflows/ci.yml (CI / Quality gates (Node 24)). It runs
on every PR regardless of target branch, including open/synchronize/reopen,
ready-for-review and edited events, and pushes to main. Edited events also cover
base retargeting. workflow_dispatch is available once the workflow exists on the
default branch; it is not a shortcut for launching the site.

On ubuntu-latest with Node 24, the exact ordered checks are npm ci, npm run lint,
npm run typecheck, npm test, npm run build, followed by checks that the PDF.js
worker/support files and dependency notices exist in dist. A failed command fails
the job; there is no continue-on-error or deployment step. Superseded runs for
the same PR/ref are cancelled. The stable job name is Quality gates (Node 24).

Permissions are contents: read only. Checkout does not persist credentials; no
repository secrets, publish token, Pages permissions or artifact upload is used.
setup-node caches npm's download cache using package-lock.json, not node_modules.
Official action releases are pinned by immutable SHA: checkout v7.0.1 and
setup-node v7.1.0. Update pins through reviewed PRs, checking official release notes.
References: https://github.com/actions/checkout/releases/tag/v7.0.1 and
https://github.com/actions/setup-node/releases/tag/v7.1.0

A local green test suite is not proof of a green Actions run. Before integrating
this PR, inspect its actual Actions run, expected head/merge SHA, all steps and
final success conclusion. Missing, queued, cancelled or approval-waiting checks
are not successes. Investigate logs for failures; do not bypass a failing test.
The Task 09 handoff report records the actual run or the precise execution blocker.

Branch protection/rulesets and required status checks are owner-controlled
repository settings. This task does not change them. The owner can require the
observed Quality gates (Node 24) check after CI is integrated and available on
main. Older stacked PR tips do not acquire this workflow retroactively: keep
local gates for earlier integration steps, and verify the final main CI run.
Do not require a nonexistent check on older tips and call them passing.

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
7. Retarget PR #7 (`feat/prelaunch-audit`) to `main`; review and re-run checks,
   then merge only with authorization.
8. Retarget PR #8 (`feat/ci-release-gates`) to `main`; verify its real CI run
   against the updated base, review the focused diff, then merge only with
   authorization. Confirm the subsequent main push also passes CI.

GitHub may retarget children automatically if a base branch is deleted; do not
rely on that behavior or delete branches early. A mergeability flag immediately
after PR creation can be temporary. Fetch again and inspect ancestry/content
before declaring a conflict. Missing CI is not passing CI. The new workflow
first appears in PR #8; previous feature tips have no workflow. Owner-controlled
required checks should be considered after the workflow is integrated.

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

## Observed browser checks and remaining checks

Task 08 tested the production build at 320/390/640/1280px, all five keyboard
flows, populated Split downloads, source-page controls, 120-page pagination,
cleanup and actual organizer output. Those observations remain prior evidence;
they are not Task 09 browser passes or actual 200% zoom results.

Task 09 attempted native Windows Edge control for real browser zoom. The control
runtime stopped because it could not determine the current browser URL with
sufficient confidence. UI automation was stopped without changing zoom/security
settings. Therefore actual 200% zoom, new populated-state browser smoke checks,
new screen-reader speech, and a fresh 120-page browser check remain unverified
in this task. The existing automated lifecycle/order tests still run in CI.

Only Edge and the Codex in-app browser were available through the connected
browser surfaces; on this Windows machine these do not provide an independent
Firefox/WebKit engine. Firefox was absent from the checked standard install
paths. No physical mobile session is connected. Windows Narrator exists, but
could not be exercised after native UI control stopped. Do not mark any of these
checks passed. The owner should complete them in the target browsers/devices.

Source color-pair measurements covered text, hover card backgrounds, focus rings,
help/error/warning copy and active controls; no active-text contrast failure was
confirmed. The green large heading measured 3.836:1 against its page background;
checked normal small text pairs were at least 4.820:1 and focus ring pairs at
least 5.673:1. Disabled controls use 50% opacity and have reduced contrast; inactive
controls are exempt from WCAG contrast requirements. This is a stylesheet-based
measurement, not a new rendered-state or assistive-technology certification.
Task 08's incomplete axe homepage contrast rule still merits target-browser review.

## Owner decisions and launch gate

The owner must approve the PR merges and final public deployment separately.

Final owner sign-off (do not infer approval from a green CI run):

- [ ] Review PR #8 and the actual CI evidence; approve ordered integration #1–#8.
- [ ] Verify final main CI success; separately decide required-check settings.
- [ ] Complete actual 200% zoom on all six routes with populated states, screen
      reader navigation/status checks, another engine and physical mobile downloads.
- [ ] Confirm license/rights-reserved position, host, domain, contact/privacy and
      indexing policy, and review dependency notices.
- [ ] Approve the exact release commit/artifact and rollback plan.
- [ ] Give explicit final deployment authorization; no Pages publishing is active.

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
