'use strict';

function convertToCaption(state, option) {
  const opt = {
    classPrefix: 'caption',
  };
  if (option !== undefined) {
    if (option.classPrefix !== undefined) {
      opt.classPrefix = option.classPrefix;
    }
  }

  let n = 0;
  const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}';
  const markAfterNumAfterJoint = '[.:．。：　]';

  const markAfterEn = '(?:' +
    '[ 　]*' + markAfterNumAfterJoint + '(?:(?=[ ]+)|$)|' +
    '[ 　]*' + markAfterNum + markAfterNumAfterJoint + '(?:(?=[ ]+)|$)|' +
    '[ 　]*' + markAfterNum + '(?:(?=[ 　]+[^a-z])|$)|' +
    '[.]' + markAfterNum + '(?:(?=[ 　]+[^a-z])|$)' +
  ')';
  const markAfterJa = '(?:' +
    '[ 　]*(?:' + markAfterNumAfterJoint + '|(?=[ ]))|' +
    '[ 　]*' + markAfterNum + '(?:' + markAfterNumAfterJoint + ')(?:(?=[ ])|$)|' +
    '[ 　]*' + markAfterNum + '(?:[　]|(?=[ ])|$)' +
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
      '(?:[cC][oO][dD][eE](?:[bB][lL][oO][cC][kK])?|[pP][rR][oO][gG][rR][aA][mM]|[aA][lL][gG][oO][rR][iI[tT][hH][mM])'+ markAfterEn + '|' +
      '(?:(ソース)?コード|命令|プログラム|算譜|アルゴリズム|算法)' + markAfterJa +
    ')'),
    //terminal, prompt, command
    "pre-samp": new RegExp('^(?:' +
      '(?:[cC][oO][nN][sS][oO][lL][eE]|[tT][eE][rR][mM][iI][nN][aA][lL]|[pP][rR][oO][mM][pP][tT]|[cC][oO][mM]{2}[aA][nN][dD])'+ markAfterEn + '|' +
      '(?:端末|ターミナル|コマンド|(?:コマンド)?プロンプト)' + markAfterJa +
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
        token.attrJoin('class', opt.classPrefix + '-' + mark);
        actualLabel = hasMarkLabel[0];
        actualLabelJoint = actualLabel.match(new RegExp('(' + markAfterNumAfterJoint + '|)$'));
        if(actualLabelJoint) {
          actualLabelJoint = actualLabelJoint[1];
        }
        actualLabel = actualLabel.replace(/ *$/, '');
        /*
        console.log('hasMark: ' + hasMark + ' =============================');
        console.log('actualLabel: ' + actualLabel);
        console.log('actualLabelJoint: ' + actualLabelJoint);
        */
        addLabel(state, nextToken, mark, actualLabel, actualLabelJoint, opt);
        break;
      }
    };
    n++;
  }
}

function actualLabelContent (actualLabel, actualLabelJoint) {
  if (actualLabelJoint) {
    return actualLabel.replace(new RegExp('\\\\' + actualLabelJoint + '$'), '');
  } else {
    return actualLabel;
  }
}

function addLabel(state, nextToken, mark, actualLabel, actualLabelJoint, opt) {

  const labelTokenFirst = new state.Token('text', '', 0);
  const labelTokenOpen = new state.Token('span_open', 'span', 1);
  labelTokenOpen.attrSet('class', opt.classPrefix + '-' + mark + '-label');
  const labelTokenContent = new state.Token('text', '', 0);
  labelTokenContent.content = actualLabelContent(actualLabel, actualLabelJoint);
  const labelTokenClose = new state.Token('span_close', 'span', -1);

  nextToken.children[0].content = nextToken.children[0].content.replace(actualLabel, '');
  nextToken.children.unshift(labelTokenClose);
  nextToken.children.unshift(labelTokenContent);
  nextToken.children.unshift(labelTokenOpen);
  nextToken.children.unshift(labelTokenFirst);


  // Add label joint span.
  if (!actualLabelJoint) { return; }
  nextToken.children[2].content = nextToken.children[2].content.replace(new RegExp(actualLabelJoint + ' *$'), '');

  const labelJointTokenOpen = new state.Token('span_open', 'span', 1);
  labelJointTokenOpen.attrSet('class', opt.classPrefix + '-' + mark + '-label-joint');
  const labelJointTokenContent = new state.Token('text', '', 0);
  labelJointTokenContent.content = actualLabelJoint;
  const labelJointTokenClose = new state.Token('span_close', 'span', -1);

  nextToken.children.splice(3, 0, labelJointTokenOpen, labelJointTokenContent, labelJointTokenClose);

  return true;
}

module.exports = function plugin(md, option) {
  md.core.ruler.after('inline', 'markdown-it-p-captions', (state) => {
    convertToCaption(state, option);
  });
}