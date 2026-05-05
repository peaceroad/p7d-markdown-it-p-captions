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
- `langMarkSpecCache` caches per-language mark matcher specs after applying required `type['label-layout']` suffix rules and per-mark `match-case` handling.
- `langGeneratedLabelDefaultsCache` caches normalized `generatedLabelDefaults` per language.
- `markRegState` caches language-set state (`languages`, `markReg`, `markRegEntries`, prebuilt candidate entry tables, and `generatedLabelDefaultsByLang`).
- Language keys are normalized valid-only and deduped while preserving caller order before cache lookup.
- When `languages` is explicitly provided but no valid language remains, state resolution returns an empty state rather than falling back to the default `en/ja` set.
- `setCaptionParagraph` resolves regex state from `opt.markRegState` with a safe fallback to default languages.
- `getMarkRegStateForLanguages` returns cached objects by reference; integrators must treat returned state as immutable.
- Generated-label resolution (`getGeneratedLabelDefaults` / `getFallbackLabelForText`) reads `generatedLabelDefaultsByLang` from the cached state and accepts optional `preferredLanguages` only as a tie-break for ambiguous unlabeled fallback text; unsupported or inactive hints fall back to the caller-preserved state language order rather than disabling fallback generation. Do not add a second locale cache on top.

## 4. Caption Detection Hot Path
- First gate is `isLikelyCaptionStart(content)` to skip non-candidates quickly.
- Optional marker regex (`labelPrefixMarker`) runs only when needed; marker stripping happens only after a label match.
- `labelPrefixMarker` arrays keep the first two non-empty string entries, ignore non-string/nullish entries, and compile longest-first so prefix-related markers are order-stable.
- Candidate mark entries are narrowed up-front by `caption.name`, `sp.isIframeTypeBlockquote`, and `sp.isVideoIframe`.
- `analyzeCaptionStart` is the pure read-only helper for this detection path; `setCaptionParagraph` now delegates its leading-label parse to that helper instead of duplicating regex decode logic.
- `type['label-layout']` controls only the shared suffix syntax (`spaced` vs `compact`); label-word matching is controlled per mark through string shorthand or `{ pattern, 'match-case' }`.
- Special integration case preserved:
  - `blockquote` caption can accept `img` labels in iframe-type flows.
- `setCaptionParagraph` includes defensive defaults and input guards for direct helper usage (missing `opt`, bad index/state, missing inline children).

## 5. Label Tokens & Formatting
- Adds label tokens using `span` (or `b` / `strong` via options).
- Handles joint characters as a separate `label-joint` span.
- Optional filename extraction (`strongFilename` / `dquoteFilename`).
- `dquoteFilename` extraction is no-op guarded when inline token shape lacks `"` or the leading filename pattern does not match.
- Optional body wrapper span (`wrapCaptionBody`).
- `removeUnnumberedLabel` can drop labels unless the mark is whitelisted.

## 6. Class Name Resolution
- `classPrefix` is normalized once through setup/helper option normalization: `null` / `undefined` => `caption`, surrounding whitespace is trimmed, and `''` means no prefix.
- Class names are assembled through prefix-aware helpers so no-prefix output is `img`, `img-label`, `img-label-joint`, and `img-body` rather than `-img`.
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
- Joint detection uses direct trailing-char checks instead of end-of-label regex.
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
  - `analyzeCaptionStart`
  - `buildLabelClassLookup`
  - `buildLabelPrefixMarkerRegFromMarkers`
  - `getGeneratedLabelDefaults`
  - `normalizeLabelPrefixMarkers`
  - `getFallbackLabelForText`
  - `setCaptionParagraph`
  - `markAfterNum`, `joint`, `jointFullWidth`, `jointHalfWidth`
  - `getMarkRegForLanguages`
  - `getMarkRegStateForLanguages`
  - `stripLabelPrefixMarker`
- `markReg` direct export is removed; integrators should build matcher maps via `getMarkRegForLanguages(languages)`.
- `setCaptionParagraph` returns `true` when it mutates a caption paragraph and `false` for no-op/guard exits. Callers should not expect the old no-op `caption` return value.
- Direct `setCaptionParagraph` callers may pass partial option objects; missing fields are filled with plugin defaults and normalized before use.
- Direct helper option objects are cached by object identity after normalization; callers should treat them as immutable and pass a fresh object for different settings.
- Repeated `.use(mditPCaption)` calls on the same markdown-it instance are intentionally ignored. Use separate markdown-it instances for different option sets.

## 12. Runtime Compatibility
- JSON import attributes in `lang.js` are intentional.
- Use a runtime version that supports the `with { type: 'json' }` import-attributes syntax.

## 13. Test Coverage
- Fixtures under `test/` drive expected HTML output.
- Helper-level tests verify:
  - `setCaptionParagraph` direct-call behavior, including `sp.captionDecision` compatibility and missing-`opt` fallback safety.
  - pure helper exports such as `analyzeCaptionStart`, `getGeneratedLabelDefaults`, `getFallbackLabelForText`, marker-prefix helpers, class lookup generation, `preferredLanguages` tie-break behavior, language-order tie-break behavior, and empty-state behavior for unsupported language lists.
  - option normalization edge cases such as no-prefix classes, whitespace-trimmed prefixes, duplicate `.use()` calls, and longest-first label prefix markers.
