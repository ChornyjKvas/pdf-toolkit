# Tool catalog and homepage cards

`src/lib/tools.ts` supplies stable IDs, display copy, existing route paths, icons,
category (`edit` or `convert`) and an explicit availability flag. The homepage
uses one card template and renders only `getAvailableTools()` entries. All five
current PDF editing tools remain available with their original hash routes.

Do not add an actionable converter card before its route, operation, error/file
handling, privacy wording and tests are implemented and verified. Keep planned
entries unavailable, or leave them out of the catalog. Availability is a product
release gate, not proof that a route works; retain route/navigation regression
tests whenever adding an enabled entry. Do not create empty categories or fake
upload controls merely to preview a planned tool.

DOCX/PPTX conversion is a later project stage requiring a feasibility review.
No format conversion is implemented or advertised as available in this patch.
The homepage's local-processing statement refers only to the five existing tools;
future converters must establish their own accurate processing/privacy behavior.
