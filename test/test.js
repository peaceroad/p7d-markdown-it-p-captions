const assert = require('assert');
const mdDefault = require('markdown-it')();
const mdClassPrefix = require('markdown-it')();
const mdDquoteFilename = require('markdown-it')();
const mdStrongFilename = require('markdown-it')();

const captions = require('../index.js');

mdDefault.use(captions);
mdClassPrefix.use(captions, {classPrefix: 'f'});
mdDquoteFilename.use(captions, {dquoteFilename: true});
mdStrongFilename.use(captions, {strongFilename: true});

const ms = [
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
  ], [
    'Figure 1. 猫',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> 猫</p>\n'
  ], [
    '図11　A Cat.',
    '<p class="caption-img"><span class="caption-img-label">図11<span class="caption-img-label-joint">　</span></span>A Cat.</p>\n'
  ], [
    'Table 11. A table.',
    '<p class="caption-table"><span class="caption-table-label">Table 11<span class="caption-table-label-joint">.</span></span> A table.</p>\n'
  ], [
    'Table 11. 表',
    '<p class="caption-table"><span class="caption-table-label">Table 11<span class="caption-table-label-joint">.</span></span> 表</p>\n'
  ], [
    'Figure. a cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> a cat.</p>\n'
  ], [
    'Figure 12. a cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 12<span class="caption-img-label-joint">.</span></span> a cat.</p>\n'
  ], [
    'Figure A. a cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure A<span class="caption-img-label-joint">.</span></span> a cat.</p>\n'
  ], [
    '図A. a cat.',
    '<p class="caption-img"><span class="caption-img-label">図A<span class="caption-img-label-joint">.</span></span> a cat.</p>\n'
  ], [
    '図A a cat.',
    '<p class="caption-img"><span class="caption-img-label">図A</span> a cat.</p>\n'
  ], [
    'Figure.A A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure.A</span> A cat.</p>\n'
  ], [
    '図：A cat.',
    '<p class="caption-img"><span class="caption-img-label">図<span class="caption-img-label-joint">：</span></span>A cat.</p>\n'
  ], [
    '図1：A cat.',
    '<p class="caption-img"><span class="caption-img-label">図1<span class="caption-img-label-joint">：</span></span>A cat.</p>\n'
  ], [
    '図1.1. A cat.',
    '<p class="caption-img"><span class="caption-img-label">図1.1<span class="caption-img-label-joint">.</span></span> A cat.</p>\n'
  ], [
    '図1.1.A Cat.',
    '<p class="caption-img"><span class="caption-img-label">図1.1.A</span> Cat.</p>\n'
  ], [
    '図1: A cat.',
    '<p class="caption-img"><span class="caption-img-label">図1<span class="caption-img-label-joint">:</span></span> A cat.</p>\n'
  ], [
    '図1.1: A cat.',
    '<p class="caption-img"><span class="caption-img-label">図1.1<span class="caption-img-label-joint">:</span></span> A cat.</p>\n'
  ], [
  'Quote: A cat.',
  '<p class="caption-blockquote"><span class="caption-blockquote-label">Quote<span class="caption-blockquote-label-joint">:</span></span> A cat.</p>\n'
  ]
];

const msCP = [
  [
    'Figure. A cat.',
    '<p class="f-img"><span class="f-img-label">Figure<span class="f-img-label-joint">.</span></span> A cat.</p>\n'
  ],
];

const msDquoteFilename = [
  [
    'Code. "Filename.js" Call a cat.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong class="caption-pre-code-filename">Filename.js</strong> Call a cat.</p>\n'
  ],
  [
    'Code. "Filename.js"Call a cat.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> &quot;Filename.js&quot;Call a cat.</p>\n'
  ],
  [
    'Code. \\"Filename.js"Call a cat.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> &quot;Filename.js&quot;Call a cat.</p>\n'
  ],
  [
    'Code. "Filename.js"',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong class="caption-pre-code-filename">Filename.js</strong></p>\n'
  ],
];

const msStrongFilename = [
  [
    'Code. **Filename.js** Call a cat.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong class="caption-pre-code-filename">Filename.js</strong> Call a cat.</p>\n'
  ],
  [
    'Code. **Filename.js**Call a cat.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong>Filename.js</strong>Call a cat.</p>\n'
  ],
  [
    'Code. \\**Filename.js** Call a cat.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> *<em>Filename.js</em>* Call a cat.</p>\n'
  ],
  [
    'Code. **Filename.js**',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> <strong class="caption-pre-code-filename">Filename.js</strong></p>\n'
  ],
];

let n = 0;
while(n < ms.length) {
  console.log('Test(ms): ' + n);
  const h = mdDefault.render(ms[n][0]);
  try {
    assert.strictEqual(h, ms[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + ms[n][0] + '\nH: ' + h +'C: ' + ms[n][1]);
  };
  n++;
}
n = 0;
while(n < msCP.length) {
  console.log('Test(msCP): ' + n);
  const hCP =   mdClassPrefix.render(msCP[n][0]);
  try {
    assert.strictEqual(hCP, msCP[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msCP[n][0] + '\nH: ' + hCP +'C: ' + msCP[n][1]);
  };
  n++;
}
n = 0;
while(n < msDquoteFilename.length) {
  console.log('Test(msFilename): ' + n);
  const hDquoteFilename = mdDquoteFilename.render(msDquoteFilename[n][0]);
  try {
    assert.strictEqual(hDquoteFilename, msDquoteFilename[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msDquoteFilename[n][0] + '\nH: ' + hDquoteFilename +'C: ' + msDquoteFilename[n][1]);
  };
  n++;
}
n = 0;
while(n < msStrongFilename.length) {
  console.log('Test(msStrongFilename): ' + n);
  const hStrongFilename = mdStrongFilename.render(msStrongFilename[n][0]);
  try {
    assert.strictEqual(hStrongFilename, msStrongFilename[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msStrongFilename[n][0] + '\nH: ' + hStrongFilename +'C: ' + msStrongFilename[n][1]);
  };
  n++;
}

