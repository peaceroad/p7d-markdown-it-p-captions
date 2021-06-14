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
| `caption-video` | movie, video, 動画 |
| `caption-table` | table, 表 |
| `caption-pre-code` | code, codeblock, program, コード, ソースコード, プログラム |
| `caption-pre-samp` | terminal, prompt, ターミナル, プロンプト |
| `caption-example` | example, 例 |

In addition, a delimiter is required after these strings.

```md
Fig. Caption

Fig: Caption

図．キャプション

図。キャプション

図：キャプション

図　キャプション
```

Exceptionally, if the serial number continues, it will work without this delimiter.

```md
Fig 1.1 Caption.

図1.1 Caption.
```

