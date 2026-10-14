# Future PDF operations

pdf-lib is installed for the next task; no PDF operation is implemented or imported into the current UI bundle.

Put future pure PDF functions here, separate from React components. Accept document bytes and options, return result bytes, and keep browser file selection, download URLs, and UI state in the presentation layer.

Guardrails for later implementation:
- Process documents locally. Never send document bytes, names, metadata, or contents to a server.
- Do not log document data or include it in error telemetry.
- Catch invalid, encrypted, or unsupported document errors and show a useful, non-sensitive error in the UI.
- Release object URLs with URL.revokeObjectURL after use; release byte buffers and component references when a task finishes or is cancelled.
- Define and test memory/file-size limits before accepting large documents.

These are requirements for subsequent tasks, not implemented PDF behavior.
