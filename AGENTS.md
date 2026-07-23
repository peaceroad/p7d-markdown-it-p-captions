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
- `analyzeCaptionParagraph` adds the paragraph/list and integration guards without mutation; `applyCaptionParagraph` validates the analyzer's private token snapshot before decorating tokens.
- `setCaptionParagraph` is the compatibility analyze/apply wrapper. A successful apply stores the complete decision (including the original string `number`) on `sp.captionDecision`.
- `type['label-layout']` controls only the shared suffix syntax (`spaced` vs `compact`); label-word matching is controlled per mark through string shorthand or `{ pattern, 'match-case' }`.
- `isCaptionLabelBoundary` exposes the same precompiled spaced/compact suffix and joint boundary primitive used by caption parsing. Integrators add their own vocabulary and must not duplicate the boundary regex.
- `isCaptionLabelForMark` uses a private exact-label matcher table built from the same folded language patterns. Only branded cached states are accepted; fake/inactive/invalid inputs return `false`. Public state objects remain unfrozen for compatibility, but caller mutation is unsupported and is not synchronized with the private matcher table.
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
- `createCaptionNumberingPolicy` validates and freezes generic numbering behavior; `createCaptionNumberingRuntime` creates one render-local counter owner. The runtime can be passed through the existing fourth helper argument independently of `setFigureNumber`.
- Generic `enabledMarks` accepts canonical safe mark identifiers without arbitrary array/identifier length caps because policy setup is trusted input; only user-facing `autoLabelNumberSets` canonicalizes `code` / `samp` aliases to `pre-code` / `pre-samp`.
- `getCounterKey` selects a semantic series across marks. Runtime counters are partitioned by validated `counterKey × sequenceKey`; unscoped string keys use a null-prototype object, unscoped number keys use a lazy `Map`, and scoped keys use lazy nested maps.
- `getSequenceKey` receives the validated counter key. Explicit-number parsers and generated-number formatters receive both validated keys. `null` selects the unscoped sequence and `undefined` is a sequence-key contract error.
- Policy callbacks and their results are validated before prefix-marker removal, paragraph classes, or inline-token mutation. Counter state is committed only after label-token construction succeeds. Callbacks must be pure synchronous functions; their external side effects cannot be rolled back.
- `captionDecision.number` and `hasExplicitNumber` remain source-only metadata. Generated numbers never rewrite immediate or frozen decisions.
- Custom parsers accept only `null` or positive safe integers. Every number generated by the strict policy/runtime API, including the built-in decimal formatter, must satisfy `markAfterNum`; the legacy `setFigureNumber` path intentionally retains its historical segment-overflow output.
- `generatedNumberHasNumClass: false` lets an integrator preserve a legacy pipeline in which `hasNumClass` was resolved before automatic numbering; the default is `true`.
- Standalone `autoLabelNumberSets` is strict, takes precedence over legacy `setFigureNumber`, and treats `[]` as explicit disablement. Explicit `undefined` / `null`, non-arrays, unsupported marks, and invalid entries fail during initial setup.
- The standalone plugin owns policy creation and creates at most one runtime per render. Direct caption helpers never infer a policy/runtime from the option name; they use only a branded runtime supplied in the fourth argument or the legacy plain-state path.
- New strict sets filter effective enabled marks through `removeUnnumberedLabel` / canonicalized exception marks. Legacy `setFigureNumber` keeps historical behavior.

## 9. String/Joint Optimizations
- Joint detection uses direct trailing-char checks instead of end-of-label regex.
- Leading/trailing ASCII space trimming uses dedicated helpers.
- Prefix removal prefers `startsWith + slice` before fallback replacement.
- Joint removal uses targeted string trimming (`stripTrailingJointAndSpaces`) to avoid regex churn.

## 10. Options Snapshot
- Language/formatting: `languages`, `classPrefix`, `removeMarkNameInCaptionClass`.
- Labels: `labelPrefixMarker` (string or array; first two only), `bLabel`, `strongLabel`, `hasNumClass`.
- Body/filename: `wrapCaptionBody`, `strongFilename`, `dquoteFilename`.
- Numbering: `autoLabelNumberSets`, `setFigureNumber`, `removeUnnumberedLabel`, `removeUnnumberedLabelExceptMarks`.
- Figure-class mirroring: `labelClassFollowsFigure`, `figureToLabelClassMap`.

## 11. Exported Integration APIs
- Default export: plugin factory (`mditPCaption`).
- Named exports:
  - `analyzeCaptionStart`
  - `analyzeCaptionParagraph`
  - `applyCaptionParagraph`
  - `buildLabelClassLookup`
  - `buildLabelPrefixMarkerRegFromMarkers`
  - `canonicalizeCaptionNumberingMark`
  - `createCaptionNumberingPolicy`
  - `createCaptionNumberingRuntime`
  - `getGeneratedLabelDefaults`
  - `isCaptionLabelForMark`
  - `normalizeAutoLabelNumberSets`
  - `normalizeLabelPrefixMarkers`
  - `getFallbackLabelForText`
  - `isCaptionLabelBoundary`
  - `setCaptionParagraph`
  - `markAfterNum`, `joint`, `jointFullWidth`, `jointHalfWidth`
  - `getMarkRegForLanguages`
  - `getMarkRegStateForLanguages`
  - `stripLabelPrefixMarker`
- `markReg` direct export is removed; integrators should build matcher maps via `getMarkRegForLanguages(languages)`.
- `setCaptionParagraph` returns `true` when it mutates a caption paragraph and `false` for no-op/guard exits. Callers should not expect the old no-op `caption` return value.
- Decisions returned by `analyzeCaptionParagraph` are frozen and must be passed by identity to `applyCaptionParagraph`; stale, copied, or reindexed decisions fail closed.
- Direct `setCaptionParagraph` callers may pass partial option objects; missing fields are filled with plugin defaults and normalized before use.
- Direct helper option objects are cached by object identity after normalization; callers should treat them as immutable and pass a fresh object for different settings.
- A runtime returned by `createCaptionNumberingRuntime` is mutable only through private state and must be created once per render; policies may be shared across renders.
- Repeated `.use(mditPCaption)` calls on the same markdown-it instance are intentionally ignored before validation. Initial setup validates/normalizes and registers the rule before setting the sentinel, so a failed first setup does not poison the markdown-it instance.

## 12. Runtime Compatibility
- JSON import attributes in `lang.js` are intentional.
- Use a runtime version that supports the `with { type: 'json' }` import-attributes syntax.
- Markdown-it 14.2+ preserves paragraph-boundary Unicode spaces with `asciiTrim`, so label-only `図　` reaches the plugin. Markdown-it 14.1 and earlier remove U+3000 before inline processing and cannot detect that form.

## 13. Test Coverage
- `npm test` runs both responsibility-based suites; `test:core` and `test:numbering` remain available for focused diagnostics.
- `test/test.js` owns fixtures, caption parsing/decorating contracts, boundary helpers, and generic helper exports.
- `test/test-caption-numbering.js` owns policy/runtime counters, `counterKey × sequenceKey`, callback transactions, strict overflow, numbering-specific stale decisions, standalone option validation, aliases, and duplicate `.use()` first-install-wins behavior.
- Fixtures under `test/` drive expected HTML output in the core suite.
- Core helper-level tests verify:
  - `setCaptionParagraph` direct-call behavior, including `sp.captionDecision` compatibility and missing-`opt` fallback safety.
  - pure helper exports such as `analyzeCaptionStart`, `analyzeCaptionParagraph`, `isCaptionLabelForMark`, `getGeneratedLabelDefaults`, `getFallbackLabelForText`, marker-prefix helpers, class lookup generation, `preferredLanguages` tie-break behavior, language-order tie-break behavior, and empty-state behavior for unsupported language lists.
  - planner/apply behavior including purity, stale-decision rejection, prefix markers, list/integration guards, composite numbers, and generated-number metadata.
  - non-numbering option normalization edge cases such as no-prefix classes, whitespace-trimmed prefixes, and longest-first label prefix markers.
