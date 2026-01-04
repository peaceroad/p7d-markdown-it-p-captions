# AGENTS notes for `p7d-markdown-it-p-captions`

## 1. Goal
- Detect caption paragraphs by parsing their leading label text and decorate them with classes plus label/body spans.
- Provide `setCaptionParagraph` so integrators (like `p7d-markdown-it-figure-with-p-caption`) can reuse the same label parsing/numbering rules.
- Keep output compatible with markdown-it renderers and markdown-it-attrs.

## 2. Registration & Traversal
- `md.core.ruler.after('inline', 'p-caption', ...)` scans all tokens once per render.
- For each paragraph token, `setCaptionParagraph` decides if it is a caption and injects label spans.
- Skips paragraphs that are immediately after `list_item_open` to avoid list-item edge cases.

## 3. Label Detection
- Label patterns are built from `lang/*.json` and combined into `markReg` per language set.
- The parser respects language rules for inter-word spacing and joint characters (`.`, `:`, full-width variants, and space).
- Optional `labelPrefixMarker` accepts a string or array (first two entries only) to allow a marker before labels; it is stripped after parsing.

## 4. Label Tokens & Formatting
- Adds label tokens using `span` (or `b` / `strong` via options).
- Handles joint characters as a separate `label-joint` span.
- Optional filename extraction (`strongFilename` / `dquoteFilename`).
- Optional body wrapper span (`wrapCaptionBody`).
- `removeUnnumberedLabel` can drop labels unless the mark is whitelisted.

## 5. Figure-Class Mirroring
- When `labelClassFollowsFigure` is true, label/body class bases come from `sp.figureClassName`.
- `figureToLabelClassMap` can override bases per figure class.
- Bases are normalized and cached on `sp` to avoid recomputing per label.

## 6. Numbering
- `setFigureNumber` increments counters for `img` / `table` when enabled.
- Explicit numbers in the caption update the counter and are preserved.

## 7. Performance Notes
- `markRegCache` avoids rebuilding regex sets when languages are unchanged.
- Label base lookup caches on `sp` and strips suffixes without `split()`.
- Joint trimming uses string operations for single-char joints to avoid extra RegExp work.

## 8. Options Snapshot
- Language/formatting: `languages`, `classPrefix`, `removeMarkNameInCaptionClass`.
- Labels: `labelPrefixMarker` (string or array; first two only), `bLabel`, `strongLabel`, `hasNumClass`.
- Body/filename: `wrapCaptionBody`, `strongFilename`, `dquoteFilename`.
- Numbering: `setFigureNumber`, `removeUnnumberedLabel`, `removeUnnumberedLabelExceptMarks`.
- Figure-class mirroring: `labelClassFollowsFigure`, `figureToLabelClassMap`.

## 9. Test Coverage
- Fixtures under `test/` drive expected HTML output.
