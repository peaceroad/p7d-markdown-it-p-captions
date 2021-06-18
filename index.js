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

  //fig(ure)?, illust, photo
  const imageMarkReg = new RegExp('^(?:' +
    '(?:[fF][iI][gG](:?[uU][rR][eE])?|[iI][lL]{2}[uU][sS][tT]|[pP][hH][oO[tT][oO])'+ markAfterEn + '|' +
    '(?:図|イラスト|写真)' + markAfterJa +
  ')');

  //movie, video
  const videoMarkReg = new RegExp('^(?:' +
    '(?:[mM][oO][vV][iI][eE]|[vV][iI][dD][eE][oO])'+ markAfterEn + '|' +
    '(?:動画|ビデオ)' + markAfterJa +
  ')');

  //table
  const tableMarkReg = new RegExp('^(?:' +
    '(?:[tT][aA][bB][lL][eE])'+ markAfterEn + '|' +
    '(?:表)' + markAfterJa +
  ')');


  //code(block)?, program
  const codeMarkReg = new RegExp('^(?:' +
    '(?:[cC][oO][dD][eE](?:[bB][lL][oO][cC][kK])?|[pP][rR][oO][gG][rR][aA][mM])'+ markAfterEn + '|' +
    '(?:(ソース)?コード|ブロック)' + markAfterJa +
  ')');

  //terminal, prompt, command
  const sampMarkReg = new RegExp('^(?:' +
    '(?:[tT][eE][rR][mM][iI][nN][aA][lL]|[pP][rR][oO][mM][pP][tT]|[cC][oO][mM]{2}[aA][nN][dD])'+ markAfterEn + '|' +
    '(?:ターミナル|プロンプト|コマンド)' + markAfterJa +
  ')');

  //example
  const exampleMarkReg = new RegExp('^(?:' +
    '(?:[eE][xX][aA][mM][pP][lL][eE])'+ markAfterEn + '|' +
    '(?:例)' + markAfterJa +
  ')');


  while (n < state.tokens.length - 1) {
    const token = state.tokens[n];
    const nextToken = state.tokens[n+1];
    const isParagraphStartTag = token.type === 'paragraph_open'
    const hasImageMark = imageMarkReg.test(nextToken.content);
    const hasVideoMark = videoMarkReg.test(nextToken.content);
    const hasTableMark = tableMarkReg.test(nextToken.content);
    const hasCodeMark = codeMarkReg.test(nextToken.content);
    const hasSampMark = sampMarkReg.test(nextToken.content);
    const hasExampleMark = exampleMarkReg.test(nextToken.content);
    //const hasMark = hasImageMark || hasVideoMark || hasTableMark || hasCodeMark || hasSampMark || hasExampleMark;
    if (isParagraphStartTag) {
      if (hasImageMark) addClass(token, 'caption-img');
      if (hasVideoMark) addClass(token, 'caption-video');
      if (hasTableMark) addClass(token, 'caption-table');
      if (hasCodeMark) addClass(token, 'caption-pre-code');
      if (hasSampMark) addClass(token, 'caption-pre-samp');
      if (hasExampleMark) addClass(token, 'caption-example');
    }
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

module.exports = function plugin(md) {
  md.core.ruler.after('inline', 'markdown-it-p-captions', (state) => {
    convertToCaption(state);
  });
}