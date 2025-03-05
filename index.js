const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}';
const joint = '[.:．。：　]';
const jointFullWidth = '[．。：　]';
const jointHalfWidth = '[.:]';
const jointSuffixReg = new RegExp('(' + joint + '|)$')

const markAfterEn = '(?:' +
  ' *(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+[^0-9a-zA-Z])' +
  ')|' +
  ' *(' + markAfterNum + ')(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+[^a-z])|$' +
  ')|' +
  '[.](' + markAfterNum + ')(?:' +
    joint + '|(?=[ ]+[^a-z])|$' +
  ')' +
')';

const markAfterJa = '(?:' +
  ' *(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+)' +
  ')|' +
  ' *(' + markAfterNum + ')(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+)|$' +
  ')' +
')';

const markReg = {
  //fig(ure)?, illust, photo
  "img": new RegExp('^(?:' +
    '([fF][iI][gG](?:[uU][rR][eE])?|[iI][lL]{2}[uU][sS][tT]|[pP][hH][oO][tT][oO])'+ markAfterEn + '|' +
    '(図|イラスト|写真)' + markAfterJa +
  ')'),
  //movie, video
  "video": new RegExp('^(?:' +
    '([mM][oO][vV][iI][eE]|[vV][iI][dD][eE][oO])'+ markAfterEn + '|' +
    '(動画|ビデオ)' + markAfterJa +
  ')'),
  //table
  "table": new RegExp('^(?:' +
    '([tT][aA][bB][lL][eE])'+ markAfterEn + '|' +
    '(表)' + markAfterJa +
  ')'),
  //code(block)?, program
  "pre-code": new RegExp('^(?:' +
    '([cC][oO][dD][eE](?:[bB][lL][oO][cC][kK])?|[pP][rR][oO][gG][rR][aA][mM]|[aA][lL][gG][oO][rR][iI][tT][hH][mM])'+ markAfterEn + '|' +
    '((?:ソース)?コード|リスト|命令|プログラム|算譜|アルゴリズム|算法)' + markAfterJa +
  ')'),
  //terminal, prompt, command
  "pre-samp": new RegExp('^(?:' +
    '([cC][oO][nN][sS][oO][lL][eE]|[tT][eE][rR][mM][iI][nN][aA][lL]|[pP][rR][oO][mM][pP][tT]|[cC][oO][mM]{2}[aA][nN][dD])'+ markAfterEn + '|' +
    '(端末|リスト|ターミナル|コマンド|(?:コマンド)?プロンプト|図)' + markAfterJa +
  ')'),
  //quote, blockquote, source
  "blockquote": new RegExp('^(?:' +
    '((?:[bB][lL][oO][cC][kK])?[qQ][uU][oO][tT][eE]|[sS][oO][uU][rR][cC][eE])'+ markAfterEn + '|' +
    '(引用(?:元)?|出典)' + markAfterJa +
  ')'),
  //slide
  "slide": new RegExp('^(?:' +
    '([sS][lL][iI][dD][eE])'+ markAfterEn + '|' +
    '(スライド)' + markAfterJa +
  ')')
};

/* Notice: the label only caption such as "Figure.\n" and "図。\n" can be converted, but double-byte space caption i.e. `図　\n` only  cannot be converted. (This happens because the full-width spaces at the end of the paragraph have been trimmed.) */

const setFigureNumber = (n, state, mark, actualLabel, fNum) => {
  const nextToken = state.tokens[n+1];
  fNum[mark]++;
  let vNum = fNum[mark];
  let regCont = '^' + actualLabel.mark
  let replacedCont = actualLabel.mark + (/^[a-zA-Z]/.test(actualLabel.mark) ? ' ' : '') + vNum
  actualLabel.num = vNum
  const reg = new RegExp(regCont)
  nextToken.content = nextToken.content.replace(reg, replacedCont)
  nextToken.children[0].content = nextToken.children[0].content.replace(reg, replacedCont)
  actualLabel.content = actualLabel.content.replace(reg, replacedCont)
  return
}

const setCaptionParagraph = (n, state, caption, fNum, sp, opt) => {
  const token = state.tokens[n];
  const nextToken = state.tokens[n+1];
  const isParagraphStartTag = token.type === 'paragraph_open';
  if (!isParagraphStartTag)  return caption
  if (n > 1) {
    const isList = state.tokens[n-1].type === 'list_item_open';
    if (isList) return caption
  }
  const actualLabel = {
    content: '',
    mark: '',
    num: '',
    joint: '',
  }
  for (let mark of Object.keys(markReg)) {
    const hasMarkLabel = nextToken.content.match(markReg[mark]);
    if (!hasMarkLabel) continue

    if (hasMarkLabel[1] === undefined) {
      actualLabel.mark = hasMarkLabel[4]
      actualLabel.num = hasMarkLabel[5]
    } else {
      actualLabel.mark = hasMarkLabel[1]
      actualLabel.num = hasMarkLabel[2]
    }

    if (caption.name) {
      if (caption.name === 'pre-samp' && mark === 'img' && actualLabel.mark === '図') continue // for 図 sampキャプション
      if (caption.name !== mark && actualLabel.mark === 'リスト') continue // for リスト sampキャプション
    }

    //console.log(hasMarkLabel)
    //console.log('mark: ' + mark + ', caption.name: ' + caption.name + ', sp.isIframeTypeBlockquote: ' + sp.isIframeTypeBlockquote, ', sp.isVideoIframe: ' + sp.isVideoIframe)
    if (sp.isIframeTypeBlockquote) {
      if (mark !== 'blockquote' && caption.name !== 'blockquote') return
    } else if (sp.isVideoIframe) {
      if (mark !== 'video' && caption.name !== 'iframe') return
    } else if (caption.name) {
      if(caption.name !== 'iframe' && caption.name !== mark) return
    }

    token.attrJoin('class', opt.classPrefix + '-' + mark);
    actualLabel.content = hasMarkLabel[0];

    if (opt.setFigureNumber && (mark === 'img' || mark === 'table')) {
      if (actualLabel.num === undefined) {
        setFigureNumber(n, state, mark, actualLabel, fNum)
      } else if (actualLabel.num > 0) {
        fNum[mark] = actualLabel.num
      }
    }

    actualLabel.joint = actualLabel.content.match(jointSuffixReg)
    if(actualLabel.joint) {
      actualLabel.joint = actualLabel.joint[1]
    }
    actualLabel.content = actualLabel.content.replace(/ *$/, '')
    let convertJointSpaceFullWith = false;
    if (opt.jointSpaceUseHalfWidth && actualLabel.joint === '　') {
      actualLabel.joint = ''
      convertJointSpaceFullWith = true
    }
    //console.log('actualLabel.content: ' + actualLabel.content + ', actualLabel.mark: ' + actualLabel.mark + ', actualLabel.num: ' + actualLabel.num + ', actualLabel.joint: ' + actualLabel.joint);
    addLabelToken(state, nextToken, mark, actualLabel, convertJointSpaceFullWith, opt);
    return
  }
  return
}

const setFilename = (state, nextToken, mark, opt) => {
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

const addLabelToken = (state, nextToken, mark, actualLabel, convertJointSpaceFullWith, opt) => {
  let labelTag = 'span';
  if (opt.bLabel) labelTag = 'b';
  if (opt.strongLabel) labelTag = 'strong';

  const labelToken = {
    first: new state.Token('text', '', 0),
    open: new state.Token(labelTag + '_open', labelTag, 1),
    content: new state.Token('text', '', 0),
    close: new state.Token(labelTag + '_close', labelTag, -1),
  };

  let classPrefix = opt.classPrefix + '-'
  if (!opt.removeMarkNameInCaptionClass) {
    classPrefix += mark + '-'
  }
  labelToken.open.attrSet('class', classPrefix + 'label');
  if (opt.hasNumClass && actualLabel.num) {
    labelToken.open.attrJoin('class', 'label-has-num');
  }

  nextToken.children[0].content = nextToken.children[0].content.replace(actualLabel.content, '');
  if (convertJointSpaceFullWith) {
    actualLabel.content = actualLabel.content.replace(/　$/, '')
    nextToken.children[0].content = ' ' + nextToken.children[0].content.replace(/^　/, '');
  }
  labelToken.content.content = actualLabel.content

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
      setFilename(state, nextToken, mark, opt)
    }
  }

  if (actualLabel.num) {
    addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt);
  } else {
    if (opt.removeUnnumberedLabel) {
      if (opt.removeUnnumberedLabelExceptMarks.length > 0) {
        let isExceptMark = false
        for (let exceptMark of opt.removeUnnumberedLabelExceptMarks) {
          if (exceptMark === mark) {
            isExceptMark = true
            break
          }
        }
        if (isExceptMark) {
          addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt);
        } else {
          nextToken.children[0].content = nextToken.children[0].content.replace(new RegExp('^ *'), '');
        }
      } else {
        nextToken.children[0].content = nextToken.children[0].content.replace(new RegExp('^ *'), '');
      }
    } else {
      addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt);
    }
  }
  return true;
}

const addJointToken = (state, nextToken, mark, labelToken, actualLabelJoint, opt) => {
  nextToken.children.splice(0, 0, labelToken.first, labelToken.open, labelToken.content, labelToken.close);
  if (!actualLabelJoint) { return; }
  nextToken.children[2].content = nextToken.children[2].content.replace(new RegExp(actualLabelJoint + ' *$'), '');

  const labelJointToken = {
    open: new state.Token('span_open', 'span', 1),
    content: new state.Token('text', '', 0),
    close: new state.Token('span_close', 'span', -1),
  };
  let classPrefix = opt.classPrefix + '-'
  if (!opt.removeMarkNameInCaptionClass) {
    classPrefix += mark + '-'
  }
  labelJointToken.open.attrSet('class', classPrefix + 'label-joint');
  labelJointToken.content.content = actualLabelJoint;

  nextToken.children.splice(3, 0, labelJointToken.open, labelJointToken.content, labelJointToken.close);
  return;
}

const mditPCaption = (md, option) => {
  const opt = {
    classPrefix: 'caption',
    dquoteFilename: false,
    strongFilename: false,
    hasNumClass: false,
    bLabel: false,
    strongLabel: false,
    jointSpaceUseHalfWidth: false,
    removeUnnumberedLabel: false,
    removeUnnumberedLabelExceptMarks: [],
    setFigureNumber: false,
    removeMarkNameInCaptionClass: false,
  }
  if (option) Object.assign(opt, option)

  md.core.ruler.after('inline', 'p-caption', (state) => {
    let n = 0;
    const fNum = {
      img: 0,
      table: 0,
    }
    const caption = {
      mark: '',
      name: '',
      nameSuffix: '',
      isPrev: false,
      isNext: false,
    }
    const sp = {
      isIframeTypeBlockquote: false,
      isVideoIframe: false,
    }
    while (n < state.tokens.length - 1) {
      setCaptionParagraph(n, state, caption, fNum, sp, opt)
      n++
    }
  })
}

export default mditPCaption
export { setCaptionParagraph, markAfterNum, joint, jointFullWidth, jointHalfWidth, markAfterEn, markAfterJa, markReg }