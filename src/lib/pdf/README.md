# Local PDF operations

merge.ts implements inspection and page merging using pdf-lib. It accepts byte arrays and returns output bytes or a controlled PdfMergeError. Strict object parsing is enabled. Encryption is never bypassed. Zero-page inputs are rejected, and the writer's default blank-page behavior is disabled.

files.ts performs preliminary local File validation and delegates actual parsing to inspectPdf. MergePage owns File references, visible order, busy states, and Blob URL lifetime. The UI reads files again on merge; parsed validation objects are not retained. This avoids keeping both parsed documents and raw byte copies in persistent component state.

Guardrails for later implementation:
- Process documents locally. Never send document bytes, names, metadata, or contents to a server.
- Do not log document data or include it in error telemetry.
- Catch invalid, encrypted, or unsupported document errors and show a useful, non-sensitive error in the UI.
- Release object URLs with URL.revokeObjectURL after use; release byte buffers and component references when a task finishes or is cancelled.
- Define and test memory/file-size limits before accepting large documents.

Merging implements local processing, controlled errors, and download cleanup. The size policy is a 50 MiB total warning with no fixed cap. Worker-based processing, previews, and more advanced document compatibility are deferred. Later operations must keep the same boundary and guardrails.
