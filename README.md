# p7d-markdown-it-p-captions

p7d-markdown-it-p-captions is a markdown-it plugin. For a paragraph, it determines if it is a caption from the string at the beginning of the paragraph and adds a class attribute value to indicate that it is a caption.

```js
import mdit from 'markdown-it'
import mditPCaption from 'p7d-markdown-it-p-captions'

const md = mdit().use(mditPCaption)

const src = 'Figure 1. A caption.\n';
console.log(md.render(src));
// <p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> A caption.</p>
```

If you want to change the prefix of the class name from ‘caption’, set the option as follows.

```js
const md = mdit().use(mditPCaption, { classPrefix: 'f' })

const src = 'Figure 1. A caption.\n';
console.log(md.render(src));
// <p class="f-img"><span class="f-img-label">Figure 1<span class="f-img-label-joint">.</span></span> A caption.</p>
```

## Helper APIs for Integrators

For integrations such as `p7d-markdown-it-figure-with-p-caption`, the package also exports helpers:

```js
import mditPCaption, {
  setCaptionParagraph,
  getMarkRegForLanguages,
  getMarkRegStateForLanguages,
} from 'p7d-markdown-it-p-captions';
```

- `getMarkRegForLanguages(languages)` returns the regex map previously accessed as `markReg`.
- `getMarkRegStateForLanguages(languages)` returns the full prebuilt state (`markReg`, `markRegEntries`, and candidate entry tables).
- The returned state is a shared cache object. Treat it as read-only; if you need to modify it, clone it first.

If you call `setCaptionParagraph` directly (outside `md.use(mditPCaption, options)`), pass `markRegState` in your options when you use non-default languages:

```js
const opt = {
  languages: ['en'],
  classPrefix: 'caption',
  markRegState: getMarkRegStateForLanguages(['en']),
  // ...other options used by setCaptionParagraph
};
```

When `sp` is provided to `setCaptionParagraph`, the helper writes:

```js
sp.captionDecision = {
  mark,              // normalized mark key (e.g., 'img', 'table', 'video')
  labelText,         // detected label word without number/joint
  hasExplicitNumber, // true when the original label included a number
};
```

## Caption detection rules

First, the strings listed in the table below are required as the first string of a paragraph to be determined as a caption.

| class attribute value | Character string at the beginning of a paragraph (uppercase or lowercase) |
| ---- | ---- |
| `caption-img` | fig, figure, illust, photo, 図, 画像, イラスト, 写真 |
| `caption-video` | movie, video, 動画, ビデオ |
| `caption-table` | table, 表 |
| `caption-pre-code` | code, sourcecode[^table-note1], codeblock[^table-note1], program, コード, ソースコード, リスト,プログラム, 算譜 |
| `caption-pre-samp` | console, terminal, prompt, command, commandprompt[^table-note1], 端末, ターミナル, コマンド, コマンドプロンプト, プロンプト, リスト [^table-note2], 図[^table-note2] |
| `caption-blockquote` | source, cited, citation, quote, blockquote[^table-note1], 引用, 引用元, 出典 |
| `caption-slide`| slide, スライド, 発表資料 |
| `caption-audio`| audio, sound, 音, 音声, 音楽, サウンド |

[^table-note1]: 'sourcecode', 'codeblock', 'commandprompt', 'blockquote' allow spaces between words. ex. For example, 'source code' is acceptable.
[^table-note2]: 'リスト' and '図' is also applicable only when used via [p7d-markdown-it-figure-with-p-caption](https://github.com/peaceroad/p7d-markdown-it-figure-with-p-caption).

Additionally, a delimiter is required after these strings (`[.:．。：　]`) as shown below. For half-width character strings, an additional space is required. In Japanese labels, both half-width and full-width spaces can be used as delimiters.

```md
Fig. A caption

Fig: A caption

図．キャプション

図。キャプション

図：キャプション

図　キャプション

図 キャプション
```

Notice. Even if the label is in English, if the caption body does not start with `[0-9a-zA-Z]`, delimiters are not necessary and only a half-width space is required to convert the caption. ex. `Figure 猫`

You can also put a serial number, such as 0-9A-Z.-, between the first term and the separator.

```md
Fig 1. A caption

Fig 1.1. A caption

Fig A: A caption

図1.1：キャプション
```

Only when it has this serial number, it can be identified by omitting the separator and adding only a space. In English, the caption written after a space must begin with an uppercase letter.

```md
Fig 1 A caption.

Fig 1.1 A caption.

Figure A A caption
```

Also, It identifies the `Figure.1` type. This format has a dot immediately after the first term, a serial number and a space after it. In this case, too, the caption written after a space must begin with an uppercase letter.

```md
Figure.1 A caption.
```

Note: paragraphs immediately following `list_item_open` are intentionally excluded from caption detection.

## Options

### Quick reference

| option | purpose |
| ---- | ---- |
| `languages` | Restrict caption-label detection to selected languages in `lang/*.json`. |
| `classPrefix` | Prefix for paragraph/label/body class names (default: `caption`). |
| `dquoteFilename` / `strongFilename` | Extract filename token right after a caption label. |
| `bLabel` / `strongLabel` | Use `b`/`strong` tag for the label wrapper instead of `span`. |
| `labelPrefixMarker` | Allow one/two marker strings before labels (stripped on match). |
| `hasNumClass` | Add `label-has-num` when label includes a number. |
| `jointSpaceUseHalfWidth` | Convert full-width joint-space labels to half-width body spacing. |
| `removeUnnumberedLabel` | Remove label span when the label has no number. |
| `removeUnnumberedLabelExceptMarks` | Keep unnumbered labels for specific marks. |
| `removeMarkNameInCaptionClass` | Use `caption-label`/`caption-body` style classes without mark suffix. |
| `wrapCaptionBody` | Wrap caption body in `<span class="...-body">...</span>`. |
| `setFigureNumber` | Auto-number `img`/`table` captions when number is omitted. |
| `labelClassFollowsFigure` | Reuse integrator-provided figure class base for label/body spans. |
| `figureToLabelClassMap` | Override label/body class bases for specific figure classes. |

## Option: Specify file name

Specify the file name before writing the caption.
Note that a space is required between the file name and caption.

### Use double quote

```js
md.use(mditPCaption, {dquoteFilename: true});

const src = 'Code. "Filename.js" Call a cat.';
console.log(md.render(src));
// <p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong class="caption-pre-code-filename">Filename.js</strong> Call a cat.</p>\n
```

### Use strong quote

```js
md.use(mditPCaption, {strongFilename: true});

const src = 'Code. **Filename** A caption.\n';
console.log(md.render(src));
// <p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong class="caption-pre-code-filename">Filename</strong> A caption.</p>\n
```

## Option: Set class indicating having label number

If the labels have numbers, add class: `label-has-num`

```js
md.use(mditPCaption, {hasNumClass: true});

const src = 'Code 1. A caption.\n';
console.log(md.render(src));
//<p class="caption-pre-code"><span class="caption-pre-code-label label-has-num">Code 1<span class="caption-pre-code-label-joint">.</span></span> A caption.</p>\n'
```

## Option: Use b/strong element for label

```js
md.use(mditPCaption, {bLabel: true});

const src = 'Code 1. A caption.\n';
console.log(md.render(src));
//<p class="caption-pre-code"><b class="caption-pre-code-label">Code 1<span class="caption-pre-code-label-joint">.</span></b> A caption.</p>\n'
```

```js
md.use(mditPCaption, {strongLabel: true});

const src = 'Code 1. A caption.\n';
console.log(md.render(src));
//<p class="caption-pre-code"><strong class="caption-pre-code-label">Code 1<span class="caption-pre-code-label-joint">.</span></strong> A caption.</p>\n'
```

## Option: Use label prefix marker

Allow a marker before the label and strip it when a caption is detected.

```js
md.use(mditPCaption, { labelPrefixMarker: '▼' });

const src = '▼Figure. A caption.\n';
console.log(md.render(src));
// <p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> A caption.</p>\n
```

`labelPrefixMarker` also accepts an array (only the first two entries are used):

```js
md.use(mditPCaption, { labelPrefixMarker: ['▼', '▲'] });
```

## Option: Convert full-width space in label joint to half-width

```js
md.use(mditPCaption, {jointSpaceUseHalfWidth: true});

const src = '図　キャプション\n';
console.log(md.render(src));
//<p class="caption-img"><span class="caption-img-label">図</span> キャプション</p>\n'
```

## Option: Remove unnumbered Label

```js
md.use(mditPCaption, {removeUnnumberedLabel: true});

const src1 = '図　キャプション\n';
console.log(md.render(src1));
//<p class="caption-img">キャプション</p>\n'

const src2 = '図1　キャプション\n';
console.log(md.render(src2));
//<p class="caption-img"><span class="caption-img-label">図1<span class="caption-img-label-joint">　</span></span>キャプション</p>\n'
```

## Option: removeUnnumberedLabelExceptMarks

```js
md.use(mditPCaption, {
  removeUnnumberedLabel: true,
  removeUnnumberedLabelExceptMarks: ["blockquote"],
});

const src1 = '図　キャプション\n';
console.log(md.render(src1));
//<p class="caption-img">キャプション</p>\n'

const src2 = '出典　キャプション\n';
console.log(md.render(src2));
//<p class="caption-blockquote"><span class="caption-blockquote-label">出典<span class="caption-blockquote-label-joint">　</span></span>キャプション</p>\n'
```

## Option: removeMarkNameInCaptionClass

Remove the mark (name) of the class attribute of the span element.

```js
md.use(mditPCaption, {
  removeMarkNameInCaptionClass: true,
});

const src = '図　キャプション\n';
console.log(md.render(src));
//<p class="caption-img"><span class="caption-label">図<span class="caption-label-joint">　</span></span>キャプション</p>\n'
```

## Option: Mirror figure classes for label/body

When `labelClassFollowsFigure` is enabled and `sp.figureClassName` is provided by an integrator,
label/body span classes also reuse those figure class bases.

```js
md.use(mditPCaption, { labelClassFollowsFigure: true });
```

You can override bases for specific figure class strings. When `figureToLabelClassMap` is provided, `labelClassFollowsFigure` is enabled automatically unless you explicitly set it to `false`.

```js
md.use(mditPCaption, {
  figureToLabelClassMap: {
    'figure-img': 'media-figure', // => media-figure-label / media-figure-label-joint / media-figure-body
  },
});
```

## Option: Wrap caption body with span

Wrap the caption body (everything after the label and optional filename) in a dedicated span element.

```js
md.use(mditPCaption, { wrapCaptionBody: true });

const src = 'Figure. A cat.\n';
console.log(md.render(src));
//<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> <span class="caption-img-body">A cat.</span></p>
```

When `removeMarkNameInCaptionClass` is enabled, the wrapper class becomes `caption-body`.

## Option: Automatically number figures and tables

Turn on automatic numbering for image (`caption-img`) and table (`caption-table`) captions that do not already include a number.

```js
md.use(mditPCaption, { setFigureNumber: true });

const src = 'Figure. A cat.\n\nTable. A list.\n\nFigure. Another cat.\n';
console.log(md.render(src));
// <p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> A cat.</p>
// <p class="caption-table"><span class="caption-table-label">Table 1<span class="caption-table-label-joint">.</span></span> A list.</p>
// <p class="caption-img"><span class="caption-img-label">Figure 2<span class="caption-img-label-joint">.</span></span> Another cat.</p>
```

- Counters are maintained separately for figures and tables and reset for every Markdown render.
- Captions that already contain a number keep that number, and the counter is updated so the next auto-generated value continues the sequence.

## Detection examples (reference)

```js
  [
    'Figure',
    '<p>Figure</p>\n'
  ], [
    'Figure ',
    '<p>Figure</p>\n'
  ], [
    'Figure.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span></p>\n'
  ], [
    'Figure:',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">:</span></span></p>\n'
  ], [
    'Figure 1',
    '<p class="caption-img"><span class="caption-img-label">Figure 1</span></p>\n'
  ], [
    'Figure A.1',
    '<p class="caption-img"><span class="caption-img-label">Figure A.1</span></p>\n'
  ], [
    'Figure. A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> A cat.</p>\n'
  ], [
    'Figure: A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">:</span></span> A cat.</p>\n'
  ], [
    'Figure is a cat.',
    '<p>Figure is a cat.</p>\n'
  ], [
    'Figure 1. A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> A cat.</p>\n'
  ], [
    'Figure 1 is a cat.',
    '<p>Figure 1 is a cat.</p>\n'
  ], [
    'Figure A A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure A</span> A cat.</p>\n'
  ], [
    'Figure 1 A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1</span> A cat.</p>\n'
  ], [
    'Figure 1 a cat.',
    '<p>Figure 1 a cat.</p>\n'
  ], [
    'Figure 1: A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">:</span></span> A cat.</p>\n'
  ], [
    '図',
    '<p>図</p>\n'
  ], [
    '図 ',
    '<p>図</p>\n'
  ], [
    '図.',
    '<p class="caption-img"><span class="caption-img-label">図<span class="caption-img-label-joint">.</span></span></p>\n'
  ], [
    '図1',
    '<p class="caption-img"><span class="caption-img-label">図1</span></p>\n'
  ], [
    '図1.1',
    '<p class="caption-img"><span class="caption-img-label">図1.1</span></p>\n'
  ], [
    '図 猫',
    '<p class="caption-img"><span class="caption-img-label">図</span> 猫</p>\n'
  ], [
    '図1　猫',
    '<p class="caption-img"><span class="caption-img-label">図1<span class="caption-img-label-joint">　</span></span>猫</p>\n'
  ], [
    '図1.1 猫',
    '<p class="caption-img"><span class="caption-img-label">図1.1</span> 猫</p>\n'
  ], [
    '図は猫',
    '<p>図は猫</p>\n'
  ] , [
    '図1は猫',
    '<p>図1は猫</p>\n'
  ], [
    '図1.1は猫',
    '<p>図1.1は猫</p>\n'
  ]
```
