'use strict';

function convertToCaption(state, option) {
  const opt = {
    classPrefix: 'caption',
    dquoteFilename: false,
    strongFilename: false,
    hasNumClass: false,
  };
  if (option !== undefined) {
    for (let o in option) {
        opt[o] = option[o];
    }
  }

  let n = 0;
  const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}';
  const markAfterNumAfterJoint = '[.:．。：　]';

  const markAfterEn = '(?:' +
    '[ 　]*' + markAfterNumAfterJoint + '(?:(?=[ ]+)|$)|' +
    '[ 　]*(' + markAfterNum + ')' + markAfterNumAfterJoint + '(?:(?=[ ]+)|$)|' +
    '[ 　]*(' + markAfterNum + ')(?:(?=[ 　]+[^a-z])|$)|' +
    '[.](' + markAfterNum + ')(?:(?=[ 　]+[^a-z])|$)' +
  ')';
  const markAfterJa = '(?:' +
    '[ 　]*(?:' + markAfterNumAfterJoint + '|(?=[ ]))|' +
    '[ 　]*(' + markAfterNum + ')(?:' + markAfterNumAfterJoint + '(?:(?=[ ])|$))|' +
    '[ 　]*(' + markAfterNum + ')(?:[:。．:：　]|(?=[ ])|$)' +
  ')';

  const markReg = {
    //fig(ure)?, illust, photo
    "img": new RegExp('^(?:' +
      '(?:[fF][iI][gG](?:[uU][rR][eE])?|[iI][lL]{2}[uU][sS][tT]|[pP][hH][oO[tT][oO])'+ markAfterEn + '|' +
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
      '(?:(?:ソース)?コード|リスト|命令|プログラム|算譜|アルゴリズム|算法)' + markAfterJa +
    ')'),
    //terminal, prompt, command
    "pre-samp": new RegExp('^(?:' +
      '(?:[cC][oO][nN][sS][oO][lL][eE]|[tT][eE][rR][mM][iI][nN][aA][lL]|[pP][rR][oO][mM][pP][tT]|[cC][oO][mM]{2}[aA][nN][dD])'+ markAfterEn + '|' +
      '(?:端末|ターミナル|コマンド|(?:コマンド)?プロンプト)' + markAfterJa +
    ')'),
    //quote, blockquote
    "blockquote": new RegExp('^(?:' +
      '(?:(?:[bB][lL][oO][cC][kK])?[qQ][uU][oO][tT][eE])'+ markAfterEn + '|' +
      '(?:引用(?:元)?|出典)' + markAfterJa +
    ')')
  };

  while (n < state.tokens.length - 1) {
    const token = state.tokens[n];
    const nextToken = state.tokens[n+1];
    const isParagraphStartTag = token.type === 'paragraph_open';
    if (!isParagraphStartTag) { n++; continue; }

    let actualLabel = '';
    let actualNum = '';
    let actualLabelJoint = '';
    for (let mark of Object.keys(markReg)) {
      const hasMarkLabel = nextToken.content.match(markReg[mark]);
      if (hasMarkLabel) {
        if (opt.hasNumClass) {
          let i = 1;
          while (i < 6) {
            if (hasMarkLabel[i] !== undefined) {
              actualNum = hasMarkLabel[i];
              break;
            }
            i++;
          }
          //console.log('actualNum: ' + actualNum);
        }
        token.attrJoin('class', opt.classPrefix + '-' + mark);
        actualLabel = hasMarkLabel[0];
        actualLabelJoint = actualLabel.match(new RegExp('(' + markAfterNumAfterJoint + '|)$'));
        if(actualLabelJoint) {
          actualLabelJoint = actualLabelJoint[1];
        }
        actualLabel = actualLabel.replace(/ *$/, '');
        /*
        console.log('=============================');
        console.log('actualLabel: ' + actualLabel);
        console.log('actualLabelJoint: ' + actualLabelJoint);
        */
        addLabel(state, nextToken, mark, actualLabel, actualNum, actualLabelJoint, opt);
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

function markFilename (state, nextToken, mark, opt) {

  let filename = nextToken.children[0].content.match(/^([ 　]*?)"(\S.*?)"(?:[ 　]+|$)/);
  nextToken.children[0].content = nextToken.children[0].content.replace(/^[ 　]*?"\S.*?"([ 　]+|$)/, '$1');

  const beforeFilenameToken = new state.Token('text', '', 0)
  beforeFilenameToken.content = filename[1];
  const filenameTokenOpen = new state.Token('strong_open', 'strong', 1);
  filenameTokenOpen.attrSet('class', opt.classPrefix + '-' + mark + '-filename');
  const filenameTokenContent = new state.Token('text', '', 0);
  filenameTokenContent.content = filename[2];
  const filenameTokenClose = new state.Token('strong_close', 'strong', -1);

  nextToken.children.splice(0, 0, beforeFilenameToken, filenameTokenOpen, filenameTokenContent, filenameTokenClose);
  return;
}

function addLabel(state, nextToken, mark, actualLabel, actualNum, actualLabelJoint, opt) {

  const labelTokenFirst = new state.Token('text', '', 0);
  const labelTokenOpen = new state.Token('span_open', 'span', 1);
  labelTokenOpen.attrSet('class', opt.classPrefix + '-' + mark + '-label');
  if (opt.hasNumClass && actualNum) {
    labelTokenOpen.attrJoin('class', 'label-has-num');
  }
  const labelTokenContent = new state.Token('text', '', 0);
  labelTokenContent.content = actualLabelContent(actualLabel, actualLabelJoint);
  const labelTokenClose = new state.Token('span_close', 'span', -1);

  nextToken.children[0].content = nextToken.children[0].content.replace(actualLabel, '');


  if (opt.strongFilename) {
    if (nextToken.children.length > 4) {
      if(nextToken.children[1].type === 'strong_open'
        && nextToken.children[3].type === 'strong_close'
        && /^(?:[ 　]|$)/.test(nextToken.children[4].content)) {
        nextToken.children[1].attrJoin('class', opt.classPrefix + '-' + mark + '-filename');
      }
    }
  }

  if (opt.dquoteFilename) {
    if (nextToken.children[0].content.match(/^[ 　]*?"\S.*?"(?:[ 　]+|$)/)) {
      markFilename(state, nextToken, mark, opt);
    }
  }

  nextToken.children.splice(0, 0, labelTokenFirst, labelTokenOpen, labelTokenContent, labelTokenClose);

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