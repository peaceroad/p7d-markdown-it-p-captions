# Adding a Language

This document describes how to add a new language to `p7d-markdown-it-p-captions`.

The package currently ships language data under [`../lang/`](../lang/) and builds two things from it:

- caption-start detection regexes
- generated-label defaults used by integrators such as `p7d-markdown-it-figure-with-p-caption`

## What To Edit

When adding a language, update these places:

1. Add a new file under [`../lang/`](../lang/), for example `lang/fr.json`.
2. Export it from [`../lang.js`](../lang.js).
3. Add or extend tests in [`../test/test.js`](../test/test.js).
4. Update user-facing docs in [`../README.md`](../README.md) if the supported language list changes.

## Language File Shape

Each language file must export JSON with this shape:

```json
{
  "type": {
    "label-layout": "spaced"
  },
  "markReg": {
    "img": {
      "pattern": "(fig(?:ure)?|photo)",
      "match-case": "auto"
    },
    "table": "(table)"
  },
  "generatedLabelDefaults": {
    "img": {
      "label": "Figure",
      "joint": ".",
      "space": " "
    },
    "table": {
      "label": "Table",
      "joint": ".",
      "space": " "
    }
  }
}
```

## Field Meanings

`type['label-layout']`

- Set this to `'spaced'` when the language normally uses ASCII-space-delimited label forms such as `Figure 1. Caption`.
- Set this to `'compact'` when labels typically join directly or use full-width spacing, such as `図1　キャプション`.
- This field is required. The package does not silently guess a default layout.

`markReg`

- Keys are normalized mark names used by the package, for example `img`, `table`, `video`, `pre-code`, `blockquote`.
- Values may be either:
  - a plain regex string, or
  - an object with `{ pattern, 'match-case' }`
- Do not include the trailing number/joint/body logic here. [`../index.js`](../index.js) adds that shared suffix automatically.
- Do not add your own outer capture group just to make label extraction work. The package wraps `pattern` internally before it adds suffix logic.

`markReg[*]['match-case']`

- `'auto'`: use ASCII case expansion only when the pattern is plain ASCII lowercase; otherwise keep the pattern as-is.
- `'ascii'`: always use simple ASCII lower/upper expansion.
- `'unicode'`: compile the mark regex with JavaScript Unicode case-insensitive matching (`iu`).
- `'raw'`: use the pattern exactly as written.

`generatedLabelDefaults`

- This is the source of truth for generated fallback labels.
- Integrators use this when a caption must be synthesized from unlabeled `alt` or `title` text.
- Empty `alt` / `title` text should not generate captions automatically. Keep only the pieces needed to join a non-empty body (`label`, `joint`, `space`).

## Regex Guidance

- Keep `markReg` focused on the label word or phrase only.
- For languages with case-insensitive Latin labels, plain-string shorthand is fine; it behaves like `'match-case': 'auto'`.
- For labels that allow spaces, encode that directly in the pattern, for example `block ?quote`.
- Prefer explicit aliases over broad patterns. False positives in caption-start detection are worse than requiring one more synonym.
- The shared suffix logic does not rely on `\\b`. It uses explicit space/joint lookaheads so CJK-style labels and no-space labels can share the same parser safely.
- `label-layout: 'spaced'` is currently tuned for ASCII-style shorthand rules around spaces, numbers, and delimiter omission. If a language needs different body-leading heuristics, add tests and adjust the shared suffix logic deliberately instead of overloading `markReg`.
- Prefer `'match-case': 'unicode'` only when it materially helps the language data. If locale-specific behavior still needs multi-character aliases, keep those aliases explicit in `markReg`.

## Generated Label Guidance

- Add `generatedLabelDefaults` only for marks where unlabeled fallback generation is meaningful. In practice, `img` and `table` are the most important.
- Keep the punctuation and spacing aligned with how that language normally writes labels.
- Do not add a second flattened compatibility map. `generatedLabelDefaultsByLang` is the single source of truth exposed through `markRegState`.

## Multiple Languages and Tie-Breaking

Caption detection and generated-label fallback behave differently:

- Caption detection checks all enabled languages.
- Generated-label fallback must choose exactly one language when the text itself has no explicit label.

For that reason:

- same-script languages such as `en` / `de` / `fr` may still be ambiguous from bare text like `cat` or `note`
- `p-captions` accepts `preferredLanguages` as a tie-break order for that case
- unsupported or inactive entries in `preferredLanguages` do not disable fallback generation; they are ignored and the remaining active language order is used
- integrators should decide document-level preference order outside this package

Do not add heavy language detection libraries here just to distinguish same-script languages. That responsibility belongs to the integrator or caller.

## Unsupported Language Behavior

If a caller explicitly passes only unsupported languages, `getMarkRegStateForLanguages()` now returns an empty state instead of silently falling back to the default `en/ja` set.

That means:

- `getMarkRegStateForLanguages(undefined)` uses the default bundled languages
- `getMarkRegStateForLanguages(['fr'])` returns an empty state until `fr` is actually implemented

## Test Checklist

At minimum, cover these cases in [`../test/test.js`](../test/test.js):

- `getMarkRegForLanguages([lang])` matches the new language labels
- `getMarkRegStateForLanguages([...])` exposes the new language in `generatedLabelDefaultsByLang`
- `getGeneratedLabelDefaults()` returns the expected metadata
- `getFallbackLabelForText()` returns the expected label word
- `analyzeCaptionStart()` recognizes at least one numbered and one unnumbered caption in the new language

If the language is intended for mixed-language documents, add at least one test showing how it interacts with `preferredLanguages`.

## Integrator Checklist

If the language is used by `p7d-markdown-it-figure-with-p-caption`, also verify there:

- auto caption detection from labeled `alt` or `title`
- generated fallback from unlabeled `alt` or `title`
- mixed-language document behavior if relevant

## Practical Rule

When in doubt:

- keep detection broad enough to match real caption labels
- keep fallback generation conservative and deterministic
- prefer explicit `preferredLanguages` ordering over heavier automatic language detection
