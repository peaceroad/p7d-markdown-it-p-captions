# p7d-markdown-it-p-captions

p7d-markdown-it-p-captions is a markdown-it plugin. For a paragraph, it determines if it is a caption from the string at the beginning of the paragraph and adds a class attribute value to indicate that it is a caption.

```js
import mdit from 'markdown-it'
import mditPCption from 'p7d-markdown-it-p-captions'

const md = mdit().use(mditPCptions)

const src = 'Figure 1. A caption.\n';
console.log(md.render(src));
// <p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> A caption.</p>
```

If you want to change the prefix of the class name from ‘caption’, set the option as follows.

```js
const md = mdit().use(captions, {classPrefix: 'f'})

const src = 'Figure 1. A caption.\n';
console.log(md.render(src));
// <p class="f-img"><span class="f-img-label">Figure 1<span class="f-img-label-joint">.</span></span> A caption.</p>
```

First, the strings listed in the table below are required as the first string of a paragraph to be determined as a caption.

| class attribute value | Character string at the beginning of a paragraph (uppercase or lowercase) |
| ---- | ---- |
| `caption-img` | fig, figure, illust, photo, 図, イラスト, 写真 |
| `caption-video` | movie, video, 動画, ビデオ |
| `caption-table` | table, 表 |
| `caption-pre-code` | code, codeblock, program, algorithm, コード, ソースコード, リスト, 命令, プログラム, 算譜, アルゴリズム, 算法 |
| `caption-pre-samp` | console, terminal, prompt, command, 端末, ターミナル, コマンド, コマンドプロンプト, プロンプト |
| `caption-blockquote` | source, quote, blockquote, 引用, 引用元, 出典 |
| `caption-slide`| slide, スライド |

Additionally, a delimiter is required after these strings (`[.:．.:　]`) as shown below. For half-width character strings, an additional space is required. Also, in Japanese label, only half-width spaces can be used as delimiters.

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

Example:

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
//<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong class="caption-pre-code-filename">Filename.js</strong> Call a cat.</p>\n'
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
