const assert = require('assert');
const mdDefault = require('markdown-it')();
const mdClassPrefix = require('markdown-it')();
const mdDquoteFilename = require('markdown-it')();
const mdStrongFilename = require('markdown-it')();
const mdHasNumClass = require('markdown-it')();
const mdBLabel = require('markdown-it')();
const mdStrongLabel = require('markdown-it')();
const mdJointSpaceUseHalfWidth = require('markdown-it')();
const mdRemoveUnnumberedLabel = require('markdown-it')();

const captions = require('../index.js');

mdDefault.use(captions);
mdClassPrefix.use(captions, {classPrefix: 'f'});
mdDquoteFilename.use(captions, {dquoteFilename: true});
mdStrongFilename.use(captions, {strongFilename: true});
mdHasNumClass.use(captions, {hasNumClass: true});
mdBLabel.use(captions, {bLabel: true});
mdStrongLabel.use(captions, {strongLabel: true});
mdJointSpaceUseHalfWidth.use(captions, {jointSpaceUseHalfWidth: true});
mdRemoveUnnumberedLabel.use(captions, {removeUnnumberedLabel: true});

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
  ], [
    'リスト1 キャプション',
    '<p class="caption-pre-code"><span class="caption-pre-code-label">リスト1</span> キャプション</p>\n'
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
  ],
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



let n = 0;
while(n < ms.length) {
  console.log('Test(default): ' + n);
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
  console.log('Test(classPrefix): ' + n);
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
  console.log('Test(filename): ' + n);
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
  console.log('Test(strongFilename): ' + n);
  const hStrongFilename = mdStrongFilename.render(msStrongFilename[n][0]);
  try {
    assert.strictEqual(hStrongFilename, msStrongFilename[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msStrongFilename[n][0] + '\nH: ' + hStrongFilename +'C: ' + msStrongFilename[n][1]);
  };
  n++;
}
n = 0;
while(n < msHasNumClass.length) {
  console.log('Test(hasNumClass): ' + n);
  const hHasNumClass = mdHasNumClass.render(msHasNumClass[n][0]);
  try {
    assert.strictEqual(hHasNumClass, msHasNumClass[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msHasNumClass[n][0] + '\nH: ' + hHasNumClass +'C: ' + msHasNumClass[n][1]);
  };
  n++;
}

n = 0;
while(n < msBLabel.length) {
  console.log('Test(bLabel): ' + n);
  const hBLabel = mdBLabel.render(msBLabel[n][0]);
  try {
    assert.strictEqual(hBLabel, msBLabel[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msBLabel[n][0] + '\nH: ' + hBLabel +'C: ' + msBLabel[n][1]);
  };
  n++;
}
n = 0;
while(n < msStrongLabel.length) {
  console.log('Test(strongLabel): ' + n);
  const hStrongLabel = mdStrongLabel.render(msBLabel[n][0]);
  try {
    assert.strictEqual(hStrongLabel, msStrongLabel[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msStrongLabel[n][0] + '\nH: ' + hStrongLabel +'C: ' + msStrongLabel[n][1]);
  };
  n++;
}
n = 0;
while(n < msJointSpaceUseHalfWidth.length) {
  console.log('Test(jointSpaceUseHalfWidth): ' + n);
  const hJointSpaceUseHalfWidth = mdJointSpaceUseHalfWidth.render(msJointSpaceUseHalfWidth[n][0]);
  try {
    assert.strictEqual(hJointSpaceUseHalfWidth, msJointSpaceUseHalfWidth[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msJointSpaceUseHalfWidth[n][0] + '\nH: ' + hJointSpaceUseHalfWidth +'C: ' + msJointSpaceUseHalfWidth[n][1]);
  };
  n++;
}
n = 0;
while(n < msRemoveUnnumberedLabel.length) {
  console.log('Test(removeUnnumberedLabel): ' + n);
  const hRemoveUnnumberedLabel = mdRemoveUnnumberedLabel.render(msRemoveUnnumberedLabel[n][0]);
  try {
    assert.strictEqual(hRemoveUnnumberedLabel, msRemoveUnnumberedLabel[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + msRemoveUnnumberedLabel[n][0] + '\nH: ' + hRemoveUnnumberedLabel +'C: ' + msRemoveUnnumberedLabel[n][1]);
  };
  n++;
}


