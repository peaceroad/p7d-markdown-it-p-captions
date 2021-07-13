const assert = require('assert');
const md = require('markdown-it')();
const captions = require('../index.js');
md.use(captions);

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
  ]
];

let n = 0;
while(n < ms.length) {
  const h = md.render(ms[n][0]);
  try {
    assert.strictEqual(h, ms[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + ms[n][0] + '\nH: ' + h +'C: ' + ms[n][1]);
  };
  n++;
}
