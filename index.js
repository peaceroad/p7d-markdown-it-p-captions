'use strict';

function convertToCaption(state) {
  let n = 0;
  const markAfterNum = '(?:[A-Z0-9]{1,3}[.-]){0,5}[A-Z0-9]{1,3}';
  const markAfterNumAfterJoint = '[.:．　。：]';
  const markAfterNumAfterJointJa = '[:．。：]';

  const markAfterEn = '(?:' +
    markAfterNumAfterJoint + '[ 　]*|' +
    '[ 　]*' + markAfterNum + '(?:' + markAfterNumAfterJoint + ')?[ 　]*(?=(?:[A-Z]|$))' +
  ')';
  const markAfterJa = '(?:' +
    '(?:[ 　]+|[.](?:(?=[^ 　])|$))|' +
    markAfterNumAfterJointJa + '(?:[ 　]*|[.](?:(?=[^ 　])|$))|' +
    '[ 　]*' + markAfterNum + markAfterNumAfterJointJa + '(?:[ 　]*|[.](?:(?=[^ 　])|$))|' +
    '[ 　]*' + markAfterNum + '(?:[ 　]+|$)' +
  ')';

  const markReg = {
    //fig(ure)?, illust, photo
    "img": new RegExp('^(?:' +
      '(?:[fF][iI][gG](:?[uU][rR][eE])?|[iI][lL]{2}[uU][sS][tT]|[pP][hH][oO[tT][oO])'+ markAfterEn + '|' +
      '(?:図|イラスト|写真)' + markAfterJa +
    ')'),
    //movie, video
    "video": new RegExp('^(?:' +
      '(?:[mM][oO][vV][iI][eE]|[vV][iI][dD][eE][oO])'+ markAfterEn + '|' +
      '(?:動画|ビデオ)' + markAfterJa +
    ')'),
    //table
    "table": new RegExp('^(?:' +
      '(?:[tT][aA][bB][lL][eE])'+ markAfterEn + '|' +
      '(?:表)' + markAfterJa +
    ')'),
    //code(block)?, program
    "pre-code": new RegExp('^(?:' +
      '(?:[cC][oO][dD][eE](?:[bB][lL][oO][cC][kK])?|[pP][rR][oO][gG][rR][aA][mM])'+ markAfterEn + '|' +
      '(?:(ソース)?コード|プログラム)' + markAfterJa +
    ')'),
    //terminal, prompt, command
    "pre-samp": new RegExp('^(?:' +
      '(?:[tT][eE][rR][mM][iI][nN][aA][lL]|[pP][rR][oO][mM][pP][tT]|[cC][oO][mM]{2}[aA][nN][dD])'+ markAfterEn + '|' +
      '(?:ターミナル|プロンプト|コマンド)' + markAfterJa +
    ')'),
    //example
    "example": new RegExp('^(?:' +
      '(?:[eE][xX][aA][mM][pP][lL][eE])'+ markAfterEn + '|' +
      '(?:例)' + markAfterJa +
    ')')
  };

  while (n < state.tokens.length - 1) {
    const token = state.tokens[n];
    const nextToken = state.tokens[n+1];
    const isParagraphStartTag = token.type === 'paragraph_open';
    if (!isParagraphStartTag) { n++; continue; }

    let hasMark = false;
    let actualLabel = '';
    let actualLabelJoint = '';
    for (let mark of Object.keys(markReg)) {
      const hasMarkLabel = nextToken.content.match(markReg[mark]);
      if (hasMarkLabel) {
        hasMark = true;
        addClass(token, 'caption-' + mark);
        actualLabel = hasMarkLabel[0];
        actualLabelJoint = actualLabel.match(new RegExp('(' + markAfterNumAfterJoint + '|' + markAfterNumAfterJointJa + '|[.:]) *$'));
        if(actualLabelJoint) {
          actualLabelJoint = actualLabelJoint[1];
        }
        actualLabel = actualLabel.replace(/ *$/, '');
        /*
        console.log('hasMark: ' + hasMark + ' =============================');
        console.log('actualLabel: ' + actualLabel);
        console.log('actualLabelJoint: ' + actualLabelJoint);
        */
        addLabel(nextToken, mark, actualLabel, actualLabelJoint);
        break;
      }
    };
    n++;
  }
}

function addClass(token, className) {
  token.attrs = token.attrs || [];
  const ats = token.attrs.map(x => x[0]);
  const i = ats.indexOf('class');
  if (i === -1) {
    token.attrs.push(['class', className]);
  } else {
    let classVal = token.attrs[i][1] || '';
    const classNames = classStr.split(' ');
    if (classNames.indexOf(className) === -1) {
      classVal += ' ' + className;
      token.attrs[i][1] = classVal;
    }
  }
}
function actualLabelContent (actualLabel, actualLabelJoint) {
  if (actualLabelJoint) {
    return actualLabel.replace(new RegExp('\\\\' + actualLabelJoint + '$'), '');
  } else {
    return actualLabel;
  }
}

function addLabel(nextToken, mark, actualLabel, actualLabelJoint) {
  const lt_first = {
    type: "text",
    tag: "",
    attrs: null,
    map: null,
    nesting: 0,
    level: 0,
    children: null,
    content: "",
    markup: "",
    info: "",
    meta: null,
    block: false,
    hidden: false,
  };
  const lt_span_open = {
    type: "span_open",
    tag: "span",
    attrs: [["class", "caption-" + mark + "-label"]],
    map: null,
    nesting: 1,
    level: 0,
    children: null,
    content: "",
    markup: "",
    info: "",
    meta: null,
    block: false,
    hidden: false,
  };
  const lt_span_content = {
    type: "text",
    tag: "",
    attrs: null,
    map: null,
    nesting: 0,
    level: 1,
    children: null,
    content: actualLabelContent(actualLabel, actualLabelJoint),
    markup: "",
    info: "",
    meta: null,
    block: false,
    hidden: false,
  };
  const lt_span_close = {
    type: "span_close",
    tag: "span",
    attrs: null,
    map: null,
    nesting: -1,
    level: 0,
    children: null,
    content: "",
    markup: "",
    info: "",
    meta: null,
    block: false,
    hidden: false,
  };
  nextToken.children[0].content = nextToken.children[0].content.replace(actualLabel, '');
  nextToken.children.unshift(lt_span_close);
  nextToken.children.unshift(lt_span_content);
  nextToken.children.unshift(lt_span_open);
  nextToken.children.unshift(lt_first);

  // Add label joint span.
  if (!actualLabelJoint) { return; }
  nextToken.children[2].content = nextToken.children[2].content.replace(new RegExp(actualLabelJoint + ' *$'), '');
  //console.log(nextToken);
  const ljt_span_open = {
    type: "span_open",
    tag: "span",
    attrs: [["class", "caption-" + mark + "-label-joint"]],
    map: null,
    nesting: 1,
    level: 0,
    children: null,
    content: "",
    markup: "",
    info: "",
    meta: null,
    block: false,
    hidden: false,
  };
  const ljt_span_content = {
    type: "text",
    tag: "",
    attrs: null,
    map: null,
    nesting: 0,
    level: 1,
    children: null,
    content: actualLabelJoint,
    markup: "",
    info: "",
    meta: null,
    block: false,
    hidden: false,
  };
  const ljt_span_close = {
    type: "span_close",
    tag: "span",
    attrs: null,
    map: null,
    nesting: -1,
    level: 0,
    children: null,
    content: "",
    markup: "",
    info: "",
    meta: null,
    block: false,
    hidden: false,
  };
  nextToken.children.splice(3, 0, ljt_span_close);
  nextToken.children.splice(3, 0, ljt_span_content);
  nextToken.children.splice(3, 0, ljt_span_open);

  return;
}

module.exports = function plugin(md) {
  md.core.ruler.after('inline', 'markdown-it-p-captions', (state) => {
    convertToCaption(state);
  });
}