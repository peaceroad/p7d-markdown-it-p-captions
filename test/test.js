import assert from 'assert'
import mdit from 'markdown-it'
import mditPCaption from '../index.js'

const mdDefault = mdit().use(mditPCaption);
const mdClassPrefix = mdit().use(mditPCaption, {classPrefix: 'f'});
const mdDquoteFilename = mdit().use(mditPCaption, {dquoteFilename: true});
const mdStrongFilename = mdit().use(mditPCaption, {strongFilename: true});
const mdHasNumClass = mdit().use(mditPCaption, {hasNumClass: true});
const mdBLabel = mdit().use(mditPCaption, {bLabel: true});
const mdStrongLabel = mdit().use(mditPCaption, {strongLabel: true});
const mdJointSpaceUseHalfWidth = mdit().use(mditPCaption, {jointSpaceUseHalfWidth: true});
const mdRemoveUnnumberedLabel = mdit().use(mditPCaption, {removeUnnumberedLabel: true});
const mdRemoveUnnumberedLabelExceptBlockquote = mdit().use(mditPCaption, {removeUnnumberedLabelExceptMarks: ['blockquote']});
const mdRemoveUnnumberedLabelExceptMarks = mdit().use(mditPCaption, {
  removeUnnumberedLabel: true,
  removeUnnumberedLabelExceptMarks: ['blockquote'],
});

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
    'Figure A a cat.',
    '<p>Figure A a cat.</p>\n'
  ], [
    'Figure A a Cat.',
    '<p>Figure A a Cat.</p>\n'
  ], [
    'Figure 1 A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1</span> A cat.</p>\n'
  ], [
    'Figure 1.A.1 A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1.A.1</span> A cat.</p>\n'
  ], [
    'Figure 1 a cat.',
    '<p>Figure 1 a cat.</p>\n'
  ], [
    'Figure 1: A cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">:</span></span> A cat.</p>\n'
  ], [
    'Figure 1. a cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> a cat.</p>\n'
  ], [
    '図',
    '<p>図</p>\n'
  ], [
    '図：',
    '<p class="caption-img"><span class="caption-img-label">図<span class="caption-img-label-joint">：</span></span></p>\n'
  ], [
    '図.',
    '<p class="caption-img"><span class="caption-img-label">図<span class="caption-img-label-joint">.</span></span></p>\n'
  ], [
    '図 ',
    '<p>図</p>\n'
  ], [
    '図　',
    '<p>図</p>\n'
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
    '図　猫',
    '<p class="caption-img"><span class="caption-img-label">図<span class="caption-img-label-joint">　</span></span>猫</p>\n'
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
    '図A　a cat.',
    '<p class="caption-img"><span class="caption-img-label">図A<span class="caption-img-label-joint">　</span></span>a cat.</p>\n'
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
  ], [
    'リスト1 キャプション',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">リスト1</span> キャプション</p>\n'
  ], [
    'Source. A paper.',
    '<p class="caption-blockquote"><span class="caption-blockquote-label">Source<span class="caption-blockquote-label-joint">.</span></span> A paper.</p>\n'
  ], [
    'Slide. a slide.',
    '<p class="caption-slide"><span class="caption-slide-label">Slide<span class="caption-slide-label-joint">.</span></span> a slide.</p>\n'
  ], [
    'Code 1 A cat.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code 1</span> A cat.</p>\n'
  ], [
    'Code 1　猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code 1<span class="caption-pre-code-label-joint">　</span></span>猫</p>\n'
  ], [
    'Code 1 猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code 1</span> 猫</p>\n'
  ], [
    'Code 1. 猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code 1<span class="caption-pre-code-label-joint">.</span></span> 猫</p>\n'
  ], [
    'Code 1。猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code 1<span class="caption-pre-code-label-joint">。</span></span>猫</p>\n'
  ] , [
    'Code.1　猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code.1<span class="caption-pre-code-label-joint">　</span></span>猫</p>\n'
  ], [
    'Code. 猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></span> 猫</p>\n'
  ], [
    'Code　猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">　</span></span>猫</p>\n'
  ], [
    'Code 猫',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code</span> 猫</p>\n'
  ], [
    'Code A',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code A</span></p>\n'
  ], [
    'Code A.',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">Code A<span class="caption-pre-code-label-joint">.</span></span></p>\n'
  ], [
    'Code A a cat.',
    '<p>Code A a cat.</p>\n'
  ], [
    'fig 1. Test Caption',
    '<p class="caption-img"><span class="caption-img-label">fig 1<span class="caption-img-label-joint">.</span></span> Test Caption</p>\n'
  ], [
    'Code Testキャプション',
    '<p>Code Testキャプション</p>\n'
  ], [
    'Code 1キャプション',
    '<p>Code 1キャプション</p>\n'
  ], [
    '図 Testキャプション',
    '<p class="caption-img"><span class="caption-img-label">図</span> Testキャプション</p>\n'
  ], [
    '図 1Testキャプション',
    '<p class="caption-img"><span class="caption-img-label">図</span> 1Testキャプション</p>\n'
  ], [
    '図　Testキャプション',
    '<p class="caption-img"><span class="caption-img-label">図<span class="caption-img-label-joint">　</span></span>Testキャプション</p>\n'
  ],[
    '- コマンド：`pwd`',
    '<ul>\n<li>コマンド：<code>pwd</code></li>\n</ul>\n'
  ],[
    '段落\n\n- リスト\n- コマンド：`pwd`\n\n段落',
    '<p>段落</p>\n<ul>\n<li>リスト</li>\n<li>コマンド：<code>pwd</code></li>\n</ul>\n<p>段落</p>\n'
  ],
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

const msHasNumClass = [
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
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure 1</span></p>\n'
  ], [
    'Figure A.1',
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure A.1</span></p>\n'
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
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure 1<span class="caption-img-label-joint">.</span></span> A cat.</p>\n'
  ], [
    'Figure 1 is a cat.',
    '<p>Figure 1 is a cat.</p>\n'
  ], [
    'Figure A A cat.',
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure A</span> A cat.</p>\n'
  ], [
    'Figure 1 A cat.',
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure 1</span> A cat.</p>\n'
  ], [
    'Figure 1 a cat.',
    '<p>Figure 1 a cat.</p>\n'
  ], [
    'Figure 1: A cat.',
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure 1<span class="caption-img-label-joint">:</span></span> A cat.</p>\n'
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
    '<p class="caption-img"><span class="caption-img-label label-has-num">図1</span></p>\n'
  ], [
    '図1.1',
    '<p class="caption-img"><span class="caption-img-label label-has-num">図1.1</span></p>\n'
  ], [
    '図 猫',
    '<p class="caption-img"><span class="caption-img-label">図</span> 猫</p>\n'
  ], [
    '図1　猫',
    '<p class="caption-img"><span class="caption-img-label label-has-num">図1<span class="caption-img-label-joint">　</span></span>猫</p>\n'
  ], [
    '図1.1 猫',
    '<p class="caption-img"><span class="caption-img-label label-has-num">図1.1</span> 猫</p>\n'
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
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure 1<span class="caption-img-label-joint">.</span></span> 猫</p>\n'
  ], [
    '図11　A Cat.',
    '<p class="caption-img"><span class="caption-img-label label-has-num">図11<span class="caption-img-label-joint">　</span></span>A Cat.</p>\n'
  ], [
    'Table 11. A table.',
    '<p class="caption-table"><span class="caption-table-label label-has-num">Table 11<span class="caption-table-label-joint">.</span></span> A table.</p>\n'
  ], [
    'Table 11. 表',
    '<p class="caption-table"><span class="caption-table-label label-has-num">Table 11<span class="caption-table-label-joint">.</span></span> 表</p>\n'
  ], [
    'Figure. a cat.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> a cat.</p>\n'
  ], [
    'Figure 12. a cat.',
    '<p class="caption-img"><span class="caption-img-label label-has-num">Figure 12<span class="caption-img-label-joint">.</span></span> a cat.</p>\n'
  ]
];

const msBLabel = [
  [
    'Code. Call a cat.',
    '<p class="caption-pre-code"><b class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></b> Call a cat.</p>\n'
  ],
];
const msStrongLabel = [
  [
    'Code. Call a cat.',
    '<p class="caption-pre-code"><strong class="caption-pre-code-label">Code<span class="caption-pre-code-label-joint">.</span></strong> Call a cat.</p>\n'
  ],
];
const msJointSpaceUseHalfWidth = [
  [
    '図 キャプション',
    '<p class="caption-img"><span class="caption-img-label">図</span> キャプション</p>\n'
  ],
  [
    '図　キャプション',
    '<p class="caption-img"><span class="caption-img-label">図</span> キャプション</p>\n'
  ],
];
const msRemoveUnnumberedLabel = [
  [
    'Figure. A caption.',
    '<p class="caption-img">A caption.</p>\n'
  ],
  [
    'Figure: A caption.',
    '<p class="caption-img">A caption.</p>\n'
  ],
  [
    'Figure 1. A caption.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> A caption.</p>\n'
  ],
  [
    '図 キャプション',
    '<p class="caption-img">キャプション</p>\n'
  ],
  [
    '図　キャプション',
    '<p class="caption-img">キャプション</p>\n'
  ],
  [
    '図：キャプション',
    '<p class="caption-img">キャプション</p>\n'
  ],
  [
    '図1 キャプション',
    '<p class="caption-img"><span class="caption-img-label">図1</span> キャプション</p>\n'
  ],
  [
    '図1　キャプション',
    '<p class="caption-img"><span class="caption-img-label">図1<span class="caption-img-label-joint">　</span></span>キャプション</p>\n'
  ],
  [
    '図1：キャプション',
    '<p class="caption-img"><span class="caption-img-label">図1<span class="caption-img-label-joint">：</span></span>キャプション</p>\n'
  ],
];
const msRemoveUnnumberedLabelExceptBlockquote = [
  [
    'Source. A caption.',
    '<p class="caption-blockquote"><span class="caption-blockquote-label">Source<span class="caption-blockquote-label-joint">.</span></span> A caption.</p>\n'
  ],
  [
    '出典　キャプション',
    '<p class="caption-blockquote"><span class="caption-blockquote-label">出典<span class="caption-blockquote-label-joint">　</span></span>キャプション</p>\n'
  ],
  [
    'Figure: A caption.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">:</span></span> A caption.</p>\n'
  ],
  [
    'Figure 1. A caption.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> A caption.</p>\n'
  ],
];
const msRemoveUnnumberedLabelExceptMarks = [
  [
    'Source. A caption.',
    '<p class="caption-blockquote"><span class="caption-blockquote-label">Source<span class="caption-blockquote-label-joint">.</span></span> A caption.</p>\n'
  ],
  [
    '出典　キャプション',
    '<p class="caption-blockquote"><span class="caption-blockquote-label">出典<span class="caption-blockquote-label-joint">　</span></span>キャプション</p>\n'
  ],
  [
    'Figure: A caption.',
    '<p class="caption-img">A caption.</p>\n'
  ],
  [
    'Figure 1. A caption.',
    '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> A caption.</p>\n'
  ],
];



let n = 0;
let pass = true;
while(n < ms.length) {
//  if (n !== 73) {n++; continue;}
  const h = mdDefault.render(ms[n][0]);
  try {
    assert.strictEqual(h, ms[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(default): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + ms[n][0] + '\nH: ' + h +'C: ' + ms[n][1]);
  };
  n++;
}

n = 0;
while(n < msCP.length) {
  const hCP =   mdClassPrefix.render(msCP[n][0]);
  try {
    assert.strictEqual(hCP, msCP[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(classPrefix): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msCP[n][0] + '\nH: ' + hCP +'C: ' + msCP[n][1]);
  };
  n++;
}
n = 0;
while(n < msDquoteFilename.length) {
  const hDquoteFilename = mdDquoteFilename.render(msDquoteFilename[n][0]);
  try {
    assert.strictEqual(hDquoteFilename, msDquoteFilename[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(filename): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msDquoteFilename[n][0] + '\nH: ' + hDquoteFilename +'C: ' + msDquoteFilename[n][1]);
  };
  n++;
}
n = 0;
while(n < msStrongFilename.length) {
  const hStrongFilename = mdStrongFilename.render(msStrongFilename[n][0]);
  try {
    assert.strictEqual(hStrongFilename, msStrongFilename[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(strongFilename): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msStrongFilename[n][0] + '\nH: ' + hStrongFilename +'C: ' + msStrongFilename[n][1]);
  };
  n++;
}
n = 0;
while(n < msHasNumClass.length) {
  const hHasNumClass = mdHasNumClass.render(msHasNumClass[n][0]);
  try {
    assert.strictEqual(hHasNumClass, msHasNumClass[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(hasNumClass): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msHasNumClass[n][0] + '\nH: ' + hHasNumClass +'C: ' + msHasNumClass[n][1]);
  };
  n++;
}

n = 0;
while(n < msBLabel.length) {
  const hBLabel = mdBLabel.render(msBLabel[n][0]);
  try {
    assert.strictEqual(hBLabel, msBLabel[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(bLabel): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msBLabel[n][0] + '\nH: ' + hBLabel +'C: ' + msBLabel[n][1]);
  };
  n++;
}
n = 0;
while(n < msStrongLabel.length) {
  const hStrongLabel = mdStrongLabel.render(msBLabel[n][0]);
  try {
    assert.strictEqual(hStrongLabel, msStrongLabel[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(strongLabel): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msStrongLabel[n][0] + '\nH: ' + hStrongLabel +'C: ' + msStrongLabel[n][1]);
  };
  n++;
}
n = 0;
while(n < msJointSpaceUseHalfWidth.length) {
  const hJointSpaceUseHalfWidth = mdJointSpaceUseHalfWidth.render(msJointSpaceUseHalfWidth[n][0]);
  try {
    assert.strictEqual(hJointSpaceUseHalfWidth, msJointSpaceUseHalfWidth[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(jointSpaceUseHalfWidth): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msJointSpaceUseHalfWidth[n][0] + '\nH: ' + hJointSpaceUseHalfWidth +'C: ' + msJointSpaceUseHalfWidth[n][1]);
  };
  n++;
}
n = 0;
while(n < msRemoveUnnumberedLabel.length) {
  const hRemoveUnnumberedLabel = mdRemoveUnnumberedLabel.render(msRemoveUnnumberedLabel[n][0]);
  try {
    assert.strictEqual(hRemoveUnnumberedLabel, msRemoveUnnumberedLabel[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(removeUnnumberedLabel): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msRemoveUnnumberedLabel[n][0] + '\nH: ' + hRemoveUnnumberedLabel +'C: ' + msRemoveUnnumberedLabel[n][1]);
  };
  n++;
}
n = 0;
while(n < msRemoveUnnumberedLabelExceptBlockquote.length) {
  const hRemoveUnnumberedLabelExceptBlockquote = mdRemoveUnnumberedLabelExceptBlockquote.render(msRemoveUnnumberedLabelExceptBlockquote[n][0]);
  try {
    assert.strictEqual(hRemoveUnnumberedLabelExceptBlockquote, msRemoveUnnumberedLabelExceptBlockquote[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(removeUnnumberedLabelExceptBlockquote): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msRemoveUnnumberedLabelExceptBlockquote[n][0] + '\nH: ' + hRemoveUnnumberedLabelExceptBlockquote +'C: ' + msRemoveUnnumberedLabelExceptBlockquote[n][1]);
  };
  n++;
}
n = 0;
while(n < msRemoveUnnumberedLabelExceptMarks.length) {
  const hRemoveUnnumberedLabelExceptMarks = mdRemoveUnnumberedLabelExceptMarks.render(msRemoveUnnumberedLabelExceptMarks[n][0]);
  try {
    assert.strictEqual(hRemoveUnnumberedLabelExceptMarks, msRemoveUnnumberedLabelExceptMarks[n][1]);
  } catch(e) {
    pass = false
    console.log('Test(removeUnnumberedLabelExceptMarks): ' + n);
    console.log('Incorrect: ')
    console.log('M: ' + msRemoveUnnumberedLabelExceptMarks[n][0] + '\nH: ' + hRemoveUnnumberedLabelExceptMarks +'C: ' + msRemoveUnnumberedLabelExceptMarks[n][1]);
  };
  n++;
}

if (pass) {
  console.log('Passed all test.')
}