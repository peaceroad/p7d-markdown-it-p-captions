# AGENTS notes for `p7d-markdown-it-p-captions`

## 1. Goal
- Detect caption paragraphs by parsing their leading label text and decorate them with classes plus label/body spans.
- Provide `setCaptionParagraph` so integrators (like `p7d-markdown-it-figure-with-p-caption`) can reuse the same label parsing/numbering rules.
- Keep output compatible with markdown-it renderers and markdown-it-attrs.

## 2. Registration & Traversal
- `md.core.ruler.after('inline', 'p-caption', ...)` scans all tokens once per render.
- For each paragraph token, `setCaptionParagraph` decides if it is a caption and injects label spans.
- Skips paragraphs that are immediately after `list_item_open` to avoid list-item edge cases.

## 3. Label Regex State
- `langMarkRegCache` caches per-language mark patterns after adding language-specific suffix rules.
- `markRegState` caches language-set state (`markReg`, `markRegEntries`, and prebuilt candidate entry tables).
- Language keys are normalized (valid-only, deduped, sorted) before cache lookup.
- `setCaptionParagraph` resolves regex state from `opt.markRegState` with a safe fallback to default languages.
- `getMarkRegStateForLanguages` returns cached objects by reference; integrators must treat returned state as immutable.

## 4. Caption Detection Hot Path
- First gate is `isLikelyCaptionStart(content)` to skip non-candidates quickly.
- Optional marker regex (`labelPrefixMarker`) runs only when needed; marker stripping happens only after a label match.
- Candidate mark entries are narrowed up-front by `caption.name`, `sp.isIframeTypeBlockquote`, and `sp.isVideoIframe`.
- Special integration case preserved:
  - `blockquote` caption can accept `img` labels in iframe-type flows.
- `setCaptionParagraph` includes defensive defaults and input guards for direct helper usage (missing `opt`, bad index/state, missing inline children).

## 5. Label Tokens & Formatting
- Adds label tokens using `span` (or `b` / `strong` via options).
- Handles joint characters as a separate `label-joint` span.
- Optional filename extraction (`strongFilename` / `dquoteFilename`).
- `dquoteFilename` extraction is no-op guarded when inline token shape or leading filename pattern does not match.
- Optional body wrapper span (`wrapCaptionBody`).
- `removeUnnumberedLabel` can drop labels unless the mark is whitelisted.

## 6. Class Name Resolution
- `buildStaticClassTables` precomputes:
  - `paragraphClassByMark`
  - `captionClassByMark` (`label`, `label-joint`, `body`)
- Figure-class mirroring is still optional via `labelClassFollowsFigure`.
- `figureToLabelClassMap` still auto-enables mirroring unless `labelClassFollowsFigure` is explicitly set.

## 7. Figure-Class Mirroring
- When `labelClassFollowsFigure` is true, label/body class bases come from `sp.figureClassName`.
- `figureToLabelClassMap` can override bases per figure class.
- If `figureToLabelClassMap` is set and `labelClassFollowsFigure` is not explicitly configured, label mirroring is enabled automatically.
- Bases are normalized and cached on `sp` to avoid recomputing per label.

## 8. Numbering
- `setFigureNumber` increments counters for `img` / `table` when enabled.
- Explicit numbers in the caption update the counter and are preserved.

## 9. String/Joint Optimizations
- Joint detection uses a constant char set (`jointChars`) instead of end-of-label regex.
- Leading/trailing ASCII space trimming uses dedicated helpers.
- Prefix removal prefers `startsWith + slice` before fallback replacement.
- Joint removal uses targeted string trimming (`stripTrailingJointAndSpaces`) to avoid regex churn.

## 10. Options Snapshot
- Language/formatting: `languages`, `classPrefix`, `removeMarkNameInCaptionClass`.
- Labels: `labelPrefixMarker` (string or array; first two only), `bLabel`, `strongLabel`, `hasNumClass`.
- Body/filename: `wrapCaptionBody`, `strongFilename`, `dquoteFilename`.
- Numbering: `setFigureNumber`, `removeUnnumberedLabel`, `removeUnnumberedLabelExceptMarks`.
- Figure-class mirroring: `labelClassFollowsFigure`, `figureToLabelClassMap`.

## 11. Exported Integration APIs
- Default export: plugin factory (`mditPCaption`).
- Named exports:
  - `setCaptionParagraph`
  - `markAfterNum`, `joint`, `jointFullWidth`, `jointHalfWidth`
  - `getMarkRegForLanguages`
  - `getMarkRegStateForLanguages`
- `markReg` direct export is removed; integrators should build it via `getMarkRegForLanguages(languages)`.

## 12. Test Coverage
- Fixtures under `test/` drive expected HTML output.
- Helper-level tests verify `setCaptionParagraph` direct-call behavior, including `sp.captionDecision` compatibility and missing-`opt` fallback safety.
