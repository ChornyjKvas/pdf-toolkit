# Local PDF operations

merge.ts implements inspection and page merging using pdf-lib. It accepts byte arrays and returns output bytes or a controlled PdfMergeError. Strict object parsing is enabled. Encryption is never bypassed. Zero-page inputs are rejected, and the writer's default blank-page behavior is disabled.

split.ts reuses the existing loadPdf validator without changing Merge behavior. ranges.ts validates and normalizes user expressions while retaining 1-based groups and exact entered order. splitPdf converts to zero-based copy indices only when processing pages. All PDFs are generated before the result array is returned. SplitPage creates Blob URLs only after success and rolls back any partially allocated URLs on failure.

Separate outputs are limited to 30 groups. Individual downloads are implemented; ZIP is deferred to avoid adding a dependency for this MVP. Filename helpers sanitize unsafe characters and cap basenames at 120 characters. SplitOptions contains accessible mode/range controls, separate from parser, splitter, and UI lifecycle logic.

rotate.ts accepts document bytes, all-page mode or a 1-based selected-page expression, and 90/180/270 clockwise degrees. It reuses loadPdf and parsePageRanges, converts target indices within the operation, and adds the angle to each existing rotation modulo 360. It saves the loaded document in original order rather than reconstructing its pages; updateFieldAppearances:false avoids unrelated appearance regeneration. Unexpected save/processing errors become RotatePdfError. RotatePage handles File state and Blob URL lifetime; RotateOptions provides accessible mode/range/direction controls. Filenames reuse sourceBasename from split.ts. Merge and Split operations are unchanged.

deletePages.ts exposes getDeletionPlan, which delegates syntax and normalization to parsePageRanges and requires at least one retained page. The UI uses that same plan for eligibility/counts; the operation revalidates it against actual parsed source bytes. Retained page numbers are generated in original document order and converted to zero-based indices only for copyPages. A fresh output document contains the retained pages; this avoids source-index mutation/shifts and default blank pages, but does not promise preservation of document-level metadata, forms, bookmarks, attachments, or signatures. Unexpected failures become DeletePagesError. DeletePagesPage owns File state and Blob URLs; DeletePagesOptions owns accessible range controls. Existing Merge/Split/Rotate implementations and shared parser behavior are unchanged.

files.ts performs preliminary local File validation and delegates actual parsing to inspectPdf. MergePage owns File references, visible order, busy states, and Blob URL lifetime. The UI reads files again on merge; parsed validation objects are not retained. This avoids keeping both parsed documents and raw byte copies in persistent component state.

Guardrails for later implementation:
- Process documents locally. Never send document bytes, names, metadata, or contents to a server.
- Do not log document data or include it in error telemetry.
- Catch invalid, encrypted, or unsupported document errors and show a useful, non-sensitive error in the UI.
- Release object URLs with URL.revokeObjectURL after use; release byte buffers and component references when a task finishes or is cancelled.
- Define and test memory/file-size limits before accepting large documents.

Merging implements local processing, controlled errors, and download cleanup. The size policy is a 50 MiB total warning with no fixed cap. Worker-based processing, previews, and more advanced document compatibility are deferred. Later operations must keep the same boundary and guardrails.
