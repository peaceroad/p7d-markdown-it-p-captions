'use strict';

function convertToCaption(state) {
  let n = 0;
  const markAfterNum = '(?:[a-z0-9]{1,3}[ .-]){0,5}[a-z0-9]{1,3}';
  const markAfterNumAfterJoint = '[.:．。：　]';
  const markAfter = ' *(?:' + markAfterNum + '(?:' + markAfterNumAfterJoint+ '| )|' + markAfterNumAfterJoint + ') *';
  const imageMarkReg = new RegExp('^(?:fig(:?ure)?|illust|photo|図|イラスト|写真)' + markAfter, 'i');
  const movieMarkReg = new RegExp('^(?:movie|video|動画)' + markAfter, 'i');
  const tableMarkReg = new RegExp('^(?:table|表)' + markAfter, 'i');
  const codeMarkReg = new RegExp('^(?:code(block)?|program|(?:ソース)?コード|プログラム)' + markAfter, 'i');
  const sampMarkReg = new RegExp('^(?:terminal|prompt|ターミナル|プロンプト)' + markAfter, 'i');
  const exampleMarkReg = new RegExp('^(?:example|例)' + markAfter, 'i');

  while (n < state.tokens.length - 1) {
    const token = state.tokens[n];
    const nextToken = state.tokens[n+1];
    const isParagraphStartTag = token.type === 'paragraph_open'
    const hasImageMark = imageMarkReg.test(nextToken.content);
    const hasMovieMark = movieMarkReg.test(nextToken.content);
    const hasTableMark = tableMarkReg.test(nextToken.content);
    const hasCodeMark = codeMarkReg.test(nextToken.content);
    const hasSampMark = sampMarkReg.test(nextToken.content);
    const hasExampleMark = exampleMarkReg.test(nextToken.content);
    const hasMark = hasImageMark || hasMovieMark || hasTableMark || hasCodeMark || hasSampMark || hasExampleMark;
    if (isParagraphStartTag && hasMark) {
      if (hasImageMark) addClass(token, 'caption-img');
      if (hasMovieMark) addClass(token, 'caption-video');
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