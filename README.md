# p7d-markdown-it-p-captions

p7d-markdown-it-p-captions is a markdown-it plugin. For a paragraph, it determines if it is a caption from the string at the beginning of the paragraph and adds a class attribute value to indicate that it is a caption.

```js
const md = require('markdown-it')();
const captions = require('p7d-markdown-it-p-captions');
md.use(captions);

const src = 'Illust 1. A caption.\n';
console.log(md.render(src));
// <p class="caption-img">Illust 1. A caption.</p>
```

| class attribute value | Character string at the beginning of a paragraph (uppercase or lowercase) |
| ---- | ---- |
| `caption-img` | fig, figure, illust, photo, 図, イラスト, 写真 |
| `caption-video` | movie, video, 動画, ビデオ |
| `caption-table` | table, 表 |
| `caption-pre-code` | code, codeblock, program, コード, ソースコード, プログラム |
| `caption-pre-samp` | terminal, prompt, command, ターミナル, プロンプト, コマンド |
| `caption-example` | example, 例 |

In addition, a delimiter is required after these strings. If the character string is Japanese, half-width spaces are allowed. 

```md
Fig. Caption

Fig: Caption

図．キャプション

図。キャプション

図：キャプション

図　キャプション

図 キャプション
```

Exceptionally, if the serial number continues, it will work without this delimiter. However, the next character must be uppercase.

```md
Fig 1.1 Caption.

図1.1 Caption.
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
    '<p class="caption-img">Figure.</p>\n'
  ], [
      'Figure.',
      '<p class="caption-img">Figure.</p>\n'
  ], [
      'Figure 1',
    '<p class="caption-img">Figure 1</p>\n'
  ], [
    'Figure A.1',
    '<p class="caption-img">Figure A.1</p>\n'
  ], [
    'Figure. A cat.',
    '<p class="caption-img">Figure. A cat.</p>\n'
  ], [
    'Figure is a cat.',
    '<p>Figure is a cat.</p>\n'
  ], [
    'Figure 1. A cat.',
    '<p class="caption-img">Figure 1. A cat.</p>\n'
  ], [
    'Figure 1 is a cat.',
    '<p>Figure 1 is a cat.</p>\n'
  ], [
    'Figure A is a cat.',
    '<p>Figure A is a cat.</p>\n'
  ], [
    'Figure A A cat.',
    '<p class="caption-img">Figure A A cat.</p>\n'
  ], [
    'Figure 1 A cat.',
    '<p class="caption-img">Figure 1 A cat.</p>\n'
  ], [
    'Figure 1 a cat.',
    '<p>Figure 1 a cat.</p>\n'
  ], [
    '図',
    '<p>図</p>\n'
  ], [
    '図 ',
    '<p>図</p>\n'
  ], [
    '図.',
    '<p class="caption-img">図.</p>\n'
  ], [
    '図1',
    '<p class="caption-img">図1</p>\n'
  ], [
    '図1.1',
    '<p class="caption-img">図1.1</p>\n'
  ], [
    '図 猫',
    '<p class="caption-img">図 猫</p>\n'
  ], [
    '図1　猫',
    '<p class="caption-img">図1　猫</p>\n'
  ], [
    '図1.1 猫',
    '<p class="caption-img">図1.1 猫</p>\n'
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
