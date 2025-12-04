# AGENTS notes for p7d-markdown-it-p-captions

## README-level workflow
- The plugin extends markdown-it and rewrites paragraph tokens when the inline text begins with one of the documented caption marks (Figure/Fig/Illust/Photo, Movie/Video, Audio, Table, Code/SourceCode/Program, Console/Terminal/Prompt, Quote/Source/Citation, Slide, plus Japanese counterparts).
- After the mark it expects delimiters drawn from `[.:．。：　]`; English labels also want a space after the delimiter unless the caption body starts with non-latin text, while Japanese labels only accept half-width spaces as delimiters.
- Optional serial numbers composed of `0-9A-Z.-` may appear between the mark and delimiter; when a number is present the delimiter may be omitted if a space precedes the caption body and, for English text, that body begins with an uppercase letter.
- `Figure.1` is also considered valid (dot immediately after Figure, number immediately after the dot, then a space and an uppercase caption body).
- README documents how numbers and delimiters interact through extensive examples and explains every option exposed by the plugin (filename extraction via quotes or strong, `label-has-num`, alternate label tags, trimming full-width joints, removing unnumbered labels with per-mark exceptions, removing the mark suffix from span classes, and wrapping the caption body in its own span).

## Implementation flow in `index.js`
1. Load `langSets` (currently `en` and `ja` JSON files) to define regex fragments per caption class plus a `type.inter-word-space` flag.
2. Build shared regex constants (`markAfterNum`, joint definitions, and helper fragments `markAfterWithSpace` / `markAfterWithoutSpace`) that encode delimiter and numbering rules for languages that do or do not expect spaces.
3. `getLangMarkReg` merges the helper fragments with each language's mark patterns, duplicates ascii letters for both cases when `inter-word-space` is true, and stores the finished regex source strings in `langData`.
4. `getMarkReg` groups those per-language regex strings by caption mark, compiles them into `RegExp` instances, and caches the result by sorted language keys in `markRegCache` to avoid rebuilding when options reuse the same set.
5. The plugin factory merges defaults with user options and registers a core rule (`p-caption`) that runs after markdown-it's inline phase. For each `paragraph_open` token (skipping those directly under a list item) it calls `setCaptionParagraph` to decide whether the paragraph should become a caption.
6. `setCaptionParagraph` runs each compiled regex against the inline token content, extracts the matched mark and optional number, adds the `{classPrefix}-{mark}` class to the `<p>`, and calls helper routines when options require extra work.
7. `setFigureNumber` maintains per-document counters for `img` and `table`. When `setFigureNumber` is enabled and the detected label lacks a number, it increments the relevant counter, injects the new number into the inline children, and updates the cached label details.
8. `addLabelToken` removes the matched mark text from the inline children, injects new tokens representing the label (`span`/`b`/`strong`), appends `label-has-num` when applicable, and optionally handles filename extraction (`strongFilename` simply attaches a class to an existing strong node while `dquoteFilename` parses `"Filename"` at the start and inserts a dedicated `<strong>` node).
9. `addJointToken` strips the delimiter character(s) from the end of the label text, escapes it if necessary, builds a `<span class="{prefix}-{mark}-label-joint">`, and, when `jointSpaceUseHalfWidth` is true and the delimiter was `U+3000`, converts it into a standard ASCII space preceding the caption body.
10. `removeUnnumberedLabel` (optionally limited by `removeUnnumberedLabelExceptMarks`) controls whether labels without digits are dropped entirely by trimming the label text out of the inline children or are still wrapped just like numbered labels.

## Option behavior and interactions
- `languages`: accepts arrays like `['en', 'ja']`. Unknown codes are ignored silently; only defined languages participate in regex generation. The combination is cached using the sorted key.
- `classPrefix`: seeds every injected class. With `removeMarkNameInCaptionClass`, the plugin emits generic classes (`caption-label`, `caption-label-joint`) instead of mark-specific ones.
- `dquoteFilename`: looks for a quoted filename at the beginning of the caption body, removes it from the inline text, and reinserts it inside `<strong class="{prefix}-{mark}-filename">`.
- `strongFilename`: expects that the user already wrapped the filename with `**...**`; the plugin simply appends the filename class to that existing `<strong>` node when it sits immediately after the label.
- `hasNumClass`: when the detected label contains a number (either provided by the author or injected via `setFigureNumber`), the label wrapper also receives `label-has-num` for easier styling.
- `bLabel` / `strongLabel`: let authors change the element used to wrap the label tokens from `<span>` to `<b>` or `<strong>`.
- `jointSpaceUseHalfWidth`: only impacts the full-width space delimiter by stripping it from the label span and prefixing the caption body with a single ASCII space.
- `removeUnnumberedLabel` and `removeUnnumberedLabelExceptMarks`: control whether labels without digits remain visible; the exception list ensures specific marks (e.g., blockquote) can keep their labels while others drop them.
- `setFigureNumber`: only affects `img` and `table` captions. When enabled it increments per-mark counters, injects the new number into the content, and makes that number visible to other options (e.g., `hasNumClass`).
- `removeMarkNameInCaptionClass`: removes the `-{mark}-` fragment from label/joint classes, leaving only the prefix plus `label` or `label-joint`.
- `wrapCaptionBody`: when true, the inline content that follows the label (and optional filename span) is wrapped in `<span class="{prefix}-{mark}-body">…</span>`; if the mark name is suppressed via `removeMarkNameInCaptionClass`, the body span falls back to `caption-body`. Leading whitespace between the label and the body is preserved as a sibling text node so spacing does not collapse.

## Cautions and observations
- The optional `caption`/`sp` parameters on `setCaptionParagraph` exist for integrators such as `p7d-markdown-it-figure-with-p-caption`; the core plugin now calls the helper without them, while targeted tests cover the iframe/video/blockquote gating logic when those objects are provided.
- Regex compilation for languages that require inter-word spaces duplicates every ascii letter to `[aA]`; this naive replace will also touch characters inside character classes if future language definitions use them, so adding new languages may require more careful escaping.
- Paragraphs that are direct children of list items are skipped, which means captions at the top of `<li>` elements are never detected. This is an undocumented limitation.
- `removeUnnumberedLabel` removes the matched label text by trimming it out of `children[0].content`, so punctuation or spacing around the joint may collapse unexpectedly, especially when combined with `jointSpaceUseHalfWidth`.
- `setFigureNumber` tracks only `img` and `table`. Other caption types (code, quote, slide, etc.) can never be auto-numbered, which can lead to inconsistent styling when mixed together.
- `dquoteFilename` only fires when the filename is plain text at the start of the inline content. If the caption starts with emphasis, inline code, or links before the filename, the option silently does nothing.
- Unknown language codes in the `languages` option are dropped without warning, and there is no documented hook for registering custom `langSets` without editing the source file.
- Regex evaluation happens sequentially across `markRegKeys`, so when two language definitions produce overlapping prefixes the first match wins. This priority should be kept in mind when extending the mark tables.
- `setCaptionParagraph` and `markReg` are exported and consumed externally (`p7d-markdown-it-figure-with-p-caption` imports them to reuse caption detection, and its `imgAttrToPCaption` helper relies on `markReg['img']`). Renaming these exports, changing their signatures, or altering how classes are applied would ripple into that plugin, so coordinate changes carefully.

## Potential improvements / concerns
1. When adding new caption/container types, also extend the `setCaptionParagraph` integration tests so the `caption`/`sp` gating logic stays aligned with `p7d-markdown-it-figure-with-p-caption`.
2. Emit diagnostics (console warnings) when `languages` contains unknown codes, or allow callers to pass custom regex definitions directly so they can expand the vocabulary without patching the package.
3. Mirror the implementation limitations in README: list-item captions being skipped, filename extraction order (`strongFilename` vs `dquoteFilename`), and figure numbering being limited to `img`/`table`.
4. Harden filename extraction so it tolerates leading formatting nodes and escaped quotes, and add coverage for captions that open with inline emphasis or code.
5. Consider an option that allows caption detection inside list items or other container blocks, or clearly document why those contexts are intentionally ignored.
6. When adding more languages, prefer case-insensitive regex flags (where supported) or another strategy rather than duplicating ascii letters, which risks corrupting complex regex fragments.
