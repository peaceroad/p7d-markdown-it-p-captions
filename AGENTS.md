# AGENTS notes for p7d-markdown-it-p-captions

## README-level workflow
- The plugin extends markdown-it and rewrites `paragraph_open` tokens when the inline content begins with one of the documented caption marks (Figure/Fig/Illust/Photo, Movie/Video, Audio, Table, Code/SourceCode/Program, Console/Terminal/Prompt, Quote/Source/Citation, Slide, plus Japanese counterparts).
- After the mark it expects delimiters drawn from `[.:．。：　]`; English labels also want a space after the delimiter unless the caption body starts with non-latin text, while Japanese labels only accept half-width spaces as delimiters.
- Optional serial numbers composed of `0-9A-Z.-` may appear between the mark and delimiter; when a number is present the delimiter may be omitted if a space precedes the caption body and, for English text, that body begins with an uppercase letter.
- `Figure.1` is also considered valid (dot immediately after Figure, number immediately after the dot, then a space and an uppercase caption body).
- README documents how numbers and delimiters interact through extensive examples and explains every option: filename extraction (`dquoteFilename` / `strongFilename`), label wrapping variants, `label-has-num`, trimming full-width joints, removing unnumbered labels with per-mark exceptions, `wrapCaptionBody`, and the newer figure-class mirroring controls.

## Implementation flow in `index.js`
1. Load `langSets` (currently `en` / `ja` JSON files) to define regex fragments per caption mark plus metadata such as the `type.inter-word-space` flag.
2. Build shared regex constants (`markAfterNum`, joint definitions, helper fragments for spaced vs. non-spaced languages) that encode delimiter and numbering rules.
3. `getLangMarkReg(lang)` merges the helper fragments with each language's mark patterns, duplicates ASCII letters when `inter-word-space` is true, and stores the finished regex source strings in `langData`.
4. `getMarkReg(langs)` groups those per-language regex strings by caption mark, compiles them into cached `RegExp` instances keyed by the sorted language list so repeated option sets skip recomputation.
5. The plugin factory merges defaults with user options and registers a core rule (`p-caption`) that runs after markdown-it's inline phase. For each `paragraph_open` token (skipping those directly under a list item) it calls `setCaptionParagraph` to decide whether the paragraph should become a caption.
6. `setCaptionParagraph(state, caption, fNum, sp, opt)` runs each compiled regex against the inline token content, enforces iframe/video/blockquote constraints supplied via `caption`/`sp`, adds the `{classPrefix}-{mark}` class to the `<p>`, and dispatches to helpers when options require extra work.
7. `setFigureNumber` maintains per-document counters for `img` and `table`. When `setFigureNumber` is enabled and the detected label lacks a number, it injects the new number into both the inline children and the cached label details.
8. `addLabelToken` removes the matched mark text from the inline children, injects new tokens representing the label (`span`/`b`/`strong`), optionally attaches filename spans, and defers to `addJointToken` for delimiter handling. The helper now accepts `sp` so nested plugins can force custom class bases.
9. `addJointToken` trims the delimiter character(s), using string slicing for single characters and escaped regex fallbacks otherwise, then builds a `<span>` for the joint with classes derived from `buildCaptionClassNames`.
10. `wrapCaptionBody` (gated by `opt.wrapCaptionBody`) captures the remaining inline content, preserves leading whitespace, and wraps it in its own `<span>` whose classes also respect figure-driven overrides.

Whenever downstream integrations provide an `sp` object, `addLabelToken` now copies the detection result into `sp.captionDecision` (mark, label text, and whether an explicit number was present) so sibling plugins can inspect the decision without duplicating parsing work.

Key helpers introduced in recent revisions:
- `stripLabelSuffix`, `normalizeClassBaseList`, `appendSuffixIfMissing`, and `buildCaptionClassNames` implement “figure-driven class inheritance”. When `labelClassFollowsFigure` is enabled, the plugin mirrors `sp.figureClassName` (or `figureToLabelClassMap` overrides) onto label/joint/body spans with deduplication.
- `resolveFigureLabelBases` interprets the `sp` object supplied by integrators; the core plugin passes `null`, but `p7d-markdown-it-figure-with-p-caption` injects block-level context when it reuses `setCaptionParagraph`.

## Option behavior and interactions
- `languages`: array of keys matching `lang/*.json`. The sorted list is used as the cache key, and unknown entries are silently dropped, so a completely unknown list disables detection until its JSON counterpart exists.
- `classPrefix`: seeds every injected class (label, joint, body, filename). When `removeMarkNameInCaptionClass` is true the suffixes collapse to `caption-label`, `caption-body`, etc. Integrators can set the prefix to `''`, but they must rely on figure-driven overrides to keep classes present.
- `labelClassFollowsFigure`: reuses `sp.figureClassName` (or override map) as the base for label/joint/body classes. Works in tandem with:
  - `figureToLabelClassMap`: optional lookup object where each figure class maps to a string/array of base class names that should receive `-label`, `-label-joint`, or `-body` suffixes.
- `wrapCaptionBody`: wraps everything after the label (respecting leading whitespace) in a span whose classes follow the same base-resolution rules as labels.
- `dquoteFilename` / `strongFilename`: handle filename extraction and class application before the caption body is wrapped.
- `hasNumClass`, `bLabel`, `strongLabel`, `jointSpaceUseHalfWidth`, `removeUnnumberedLabel`, `removeUnnumberedLabelExceptMarks`, `setFigureNumber`, and `removeMarkNameInCaptionClass` behave as documented historically.

Language/caching specifics:
- `markRegCache` stores `{markReg, markRegKeys}` keyed by the sorted language list. The defaults (`['en','ja']`) hit the pre-built cache entry; alternate lists rebuild only once.
- `langData` is rebuilt only with known languages to avoid runtime errors; integrators adding a new language must provide `lang/xx.json` and ensure the option references that key.

## Cautions and observations
- `caption`/`sp` parameters are still optional but now power figure-class propagation, so exported helpers must keep accepting them for `p7d-markdown-it-figure-with-p-caption` and similar integrations.
- The ASCII duplication in `getLangMarkReg` can still touch characters inside character classes; adding complex language patterns may require more careful escaping or a case-insensitive flag.
- Paragraphs that are direct children of list items are skipped, so captions at the top of `<li>` elements are never detected (unchanged limitation).
- `removeUnnumberedLabel` trims text in-place; spacing around the delimiter can collapse when combined with `jointSpaceUseHalfWidth`.
- Only `img` and `table` participate in `setFigureNumber` auto-numbering.
- `dquoteFilename` only fires when a naked quoted string starts the caption body.
- Unknown language codes are silently ignored; a list composed entirely of unknown codes leaves `markReg` empty, so integrators should ensure their JSON exists before toggling options.
- Regex evaluation happens sequentially across `markRegKeys`; overlapping prefixes will match whichever language was processed first.
- External consumers rely on `setCaptionParagraph`, `markReg`, and the new class helpers, so signature or behavior changes need coordination with downstream plugins.

## Potential improvements / concerns
1. Emit diagnostics when `opt.languages` contains no known codes to avoid silent failures, or fall back to `allLangs` automatically.
2. Document the `labelClassFollowsFigure` / `figureToLabelClassMap` pair in README with concrete examples so downstream consumers understand how to supply `sp.figureClassName`.
3. Mirror implementation limitations (list-item skip, filename extraction order, figure-number scope) in README for clarity.
4. Harden filename extraction so it tolerates leading formatting nodes and escaped quotes, and add coverage for captions that open with inline emphasis or code.
5. Consider an option that allows caption detection inside list items or other container blocks, or clearly document why those contexts are intentionally ignored.
6. Explore case-insensitive regex flags (where supported) to avoid duplicating ASCII letters when adding new languages.
