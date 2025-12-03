import langSets from './lang.js'

const allLangs = Object.keys(langSets)
const allLangsKey = allLangs.slice().sort().join(',')
let langData = { ...langSets }

const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}'
const joint = '[.:．。：　]'
const jointFullWidth = '[．。：　]'
const jointHalfWidth = '[.:]'
const jointSuffixReg = new RegExp('(' + joint + ')$')

const markAfterWithSpace = '(?:' +
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
')'

const markAfterWithoutSpace = '(?:' +
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
')'

const getLangMarkReg = (lang) => {
  const data = langData[lang]
  const langMarkReg = {}
  Object.keys(data.markReg).forEach(mark => {
    langMarkReg[mark] = data.markReg[mark]
    if (data.type['inter-word-space']) {
      langMarkReg[mark] = langMarkReg[mark].replace(/([a-z])/g, (match) => '[' + match + match.toUpperCase() + ']')
      langMarkReg[mark] += markAfterWithSpace
    } else {
      langMarkReg[mark] += markAfterWithoutSpace
    }
  })
  return langMarkReg
}

const getMarkReg = (langs) => {
  const markPatterns = langs.reduce((patterns, lang) => {
    const langMarkReg = getLangMarkReg(lang)
    Object.keys(langMarkReg).forEach(mark => {
      if (!patterns[mark]) {
        patterns[mark] = []
      }
      patterns[mark].push(langMarkReg[mark])
    })
    return patterns
  }, {})
  const markReg = {}
  Object.keys(markPatterns).forEach(mark => {
    markReg[mark] = new RegExp('^(?:' + markPatterns[mark].join('|') + ')')
  })
  return markReg
}

let markReg = getMarkReg(allLangs)
let markRegKeys = Object.keys(markReg)
let markRegCache = {}

const mditPCaption = (md, option) => {
  const opt = {
    languages: ['en', 'ja'],
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
    wrapCaptionBody: false,
  }
  if (option) Object.assign(opt, option)

  // compare sorted keys to avoid rebuild when order differs
  const langKey = opt.languages.slice().sort().join(',')
  if (langKey !== allLangsKey) {
    if (markRegCache[langKey]) {
      markReg = markRegCache[langKey].markReg
      markRegKeys = markRegCache[langKey].markRegKeys
    } else {
      // build langData only for known languages to avoid runtime errors
      langData = {}
      const validLangs = []
      opt.languages.forEach(lang => {
        if (langSets[lang]) {
          langData[lang] = langSets[lang]
          validLangs.push(lang)
        }
      })
      // pass only validated languages to regex builder
      markReg = getMarkReg(validLangs)
      markRegKeys = Object.keys(markReg)
      markRegCache[langKey] = { markReg, markRegKeys }
    }
  }

  md.core.ruler.after('inline', 'p-caption', (state) => {
    const fNum = {
      img: 0,
      table: 0,
    }
    const len = state.tokens.length
    for (let n = 0; n < len - 1; n++) {
      // Core plugin does not track caption/sp state, but helper keeps these args
      // for downstream integrations such as p7d-markdown-it-figure-with-p-caption.
      setCaptionParagraph(n, state, null, fNum, null, opt)
    }
  })
}

const setCaptionParagraph = (n, state, caption, fNum, sp, opt) => {
  const tokens = state.tokens
  const token = tokens[n]
  if (token.type !== 'paragraph_open') return caption
  if (n > 1 && tokens[n-1].type === 'list_item_open') return caption
  const nextToken = tokens[n+1]
  const actualLabel = {
    content: '',
    mark: '',
    num: '',
    joint: '',
  }
  
  // caption/sp may be provided by integrators to enforce cross-block constraints
  const captionName = caption && caption.name ? caption.name : ''
  const spIsIframeTypeBlockquote = sp && sp.isIframeTypeBlockquote
  const spIsVideoIframe = sp && sp.isVideoIframe

  for (const mark of markRegKeys) {
    const hasMarkLabel = nextToken.content.match(markReg[mark])
    if (!hasMarkLabel) continue

    if (hasMarkLabel[1] === undefined) {
      actualLabel.mark = hasMarkLabel[4]
      actualLabel.num = hasMarkLabel[5]
    } else {
      actualLabel.mark = hasMarkLabel[1]
      actualLabel.num = hasMarkLabel[2]
    }

    if (captionName) {
      if (captionName === 'pre-samp' && mark === 'img' && actualLabel.mark === '図') continue // for 図 sampキャプション
      if (captionName !== mark && actualLabel.mark === 'リスト') continue // for リスト sampキャプション
    }

    if (spIsIframeTypeBlockquote) {
      if (mark !== 'blockquote' && captionName !== 'blockquote') return
    } else if (spIsVideoIframe) {
      if (mark !== 'video' && captionName !== 'iframe') return
    } else if (captionName) {
      if(captionName !== 'iframe' && captionName !== mark) return
    }

    token.attrJoin('class', opt.classPrefix + '-' + mark)
    actualLabel.content = hasMarkLabel[0]

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
    let convertJointSpaceFullWith = false
    if (opt.jointSpaceUseHalfWidth && actualLabel.joint === '　') {
      actualLabel.joint = ''
      convertJointSpaceFullWith = true
    }
    addLabelToken(state, nextToken, mark, actualLabel, convertJointSpaceFullWith, opt)

    return
  }
}

const setFigureNumber = (n, state, mark, actualLabel, fNum) => {
  const nextToken = state.tokens[n+1]
  fNum[mark]++
  let vNum = fNum[mark]
  let regCont = '^' + actualLabel.mark
  let replacedCont = actualLabel.mark + (/^[a-zA-Z]/.test(actualLabel.mark) ? ' ' : '') + vNum
  actualLabel.num = vNum
  const reg = new RegExp(regCont)
  nextToken.content = nextToken.content.replace(reg, replacedCont)
  nextToken.children[0].content = nextToken.children[0].content.replace(reg, replacedCont)
  actualLabel.content = actualLabel.content.replace(reg, replacedCont)
  return
}

const setFilename = (state, nextToken, mark, opt) => {
  let filename = nextToken.children[0].content.match(/^([ 　]*?)"(\S.*?)"(?:[ 　]+|$)/)
  nextToken.children[0].content = nextToken.children[0].content.replace(/^[ 　]*?"\S.*?"([ 　]+|$)/, '$1')

  const beforeFilenameToken = new state.Token('text', '', 0)
  beforeFilenameToken.content = filename[1]
  const filenameTokenOpen = new state.Token('strong_open', 'strong', 1)
  filenameTokenOpen.attrSet('class', opt.classPrefix + '-' + mark + '-filename')
  const filenameTokenContent = new state.Token('text', '', 0)
  filenameTokenContent.content = filename[2]
  const filenameTokenClose = new state.Token('strong_close', 'strong', -1)

  nextToken.children.splice(0, 0, beforeFilenameToken, filenameTokenOpen, filenameTokenContent, filenameTokenClose)
  return
}

const addLabelToken = (state, nextToken, mark, actualLabel, convertJointSpaceFullWith, opt) => {
  const children = nextToken.children
  let labelTag = 'span'
  if (opt.bLabel) labelTag = 'b'
  if (opt.strongLabel) labelTag = 'strong'

  const labelToken = {
    first: new state.Token('text', '', 0),
    open: new state.Token(labelTag + '_open', labelTag, 1),
    content: new state.Token('text', '', 0),
    close: new state.Token(labelTag + '_close', labelTag, -1),
  }
  let labelMeta = null

  let classPrefix = opt.classPrefix + '-'
  if (!opt.removeMarkNameInCaptionClass) {
    classPrefix += mark + '-'
  }
  labelToken.open.attrSet('class', classPrefix + 'label')
  if (opt.hasNumClass && actualLabel.num) {
    labelToken.open.attrJoin('class', 'label-has-num')
  }

  children[0].content = children[0].content.replace(actualLabel.content, '')
  if (convertJointSpaceFullWith) {
    actualLabel.content = actualLabel.content.replace(/　$/, '')
    children[0].content = ' ' + children[0].content.replace(/^　/, '')
  }
  labelToken.content.content = actualLabel.content

  if (opt.strongFilename) {
    if (children.length > 4) {
      if(children[1].type === 'strong_open'
        && children[3].type === 'strong_close'
        && /^(?:[ 　]|$)/.test(children[4].content)) {
        children[1].attrJoin('class', opt.classPrefix + '-' + mark + '-filename')
      }
    }
  }

  if (opt.dquoteFilename) {
    if (children[0].content.match(/^[ 　]*?"\S.*?"(?:[ 　]+|$)/)) {
      setFilename(state, nextToken, mark, opt)
    }
  }

  if (actualLabel.num) {
    labelMeta = addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt)
  } else {
    if (opt.removeUnnumberedLabel) {
      if (opt.removeUnnumberedLabelExceptMarks.length > 0) {
        if (opt.removeUnnumberedLabelExceptMarks.includes(mark)) {
          labelMeta = addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt)
        } else {
          children[0].content = children[0].content.replace(/^ */, '')
        }
      } else {
        children[0].content = children[0].content.replace(/^ */, '')
      }
    } else {
      labelMeta = addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt)
    }
  }
  if (opt.wrapCaptionBody) {
    wrapCaptionBody(state, nextToken, mark, labelMeta, opt)
  }
  return true
}

const addJointToken = (state, nextToken, mark, labelToken, actualLabelJoint, opt) => {
  nextToken.children.splice(0, 0, labelToken.first, labelToken.open, labelToken.content, labelToken.close)
  if (actualLabelJoint) {
    // Escape joint character for safe use in RegExp (e.g., '.' or ':' should be literal)
    // Prefer simple string trimming when joint is a single character to avoid RegExp allocations
    if (actualLabelJoint.length === 1) {
      // remove actualLabelJoint and trailing spaces at end
      if (nextToken.children[2].content.endsWith(actualLabelJoint)) {
        nextToken.children[2].content = nextToken.children[2].content.slice(0, -1).replace(/ *$/, '')
      } else {
        // if actualLabelJoint not exactly at end (rare), fallback to RegExp using escaped pattern
        const jointPattern = actualLabelJoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        nextToken.children[2].content = nextToken.children[2].content.replace(new RegExp(jointPattern + ' *$'), '')
      }
    } else {
      const jointPattern = actualLabelJoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      nextToken.children[2].content = nextToken.children[2].content.replace(new RegExp(jointPattern + ' *$'), '')
    }

    const labelJointToken = {
      open: new state.Token('span_open', 'span', 1),
      content: new state.Token('text', '', 0),
      close: new state.Token('span_close', 'span', -1),
    }
    let classPrefix = opt.classPrefix + '-'
    if (!opt.removeMarkNameInCaptionClass) {
      classPrefix += mark + '-'
    }
    labelJointToken.open.attrSet('class', classPrefix + 'label-joint')
    labelJointToken.content.content = actualLabelJoint

    nextToken.children.splice(3, 0, labelJointToken.open, labelJointToken.content, labelJointToken.close)
  }
  const labelCloseIndex = nextToken.children.indexOf(labelToken.close)
  return { bodyStartIndex: labelCloseIndex + 1 }
}

const wrapCaptionBody = (state, nextToken, mark, labelMeta, opt) => {
  const children = nextToken.children
  let startIndex = 0
  if (labelMeta && typeof labelMeta.bodyStartIndex === 'number') {
    startIndex = labelMeta.bodyStartIndex
  }
  while (startIndex < children.length &&
    children[startIndex].type === 'text' &&
    children[startIndex].content === '') {
    startIndex++
  }
  if (startIndex >= children.length) return
  const bodyTokens = children.slice(startIndex)
  if (!bodyTokens.length) return
  children.splice(startIndex)

  const preserveLeadingWhitespace = startIndex > 0
  let leadingSpaceToken = null
  if (preserveLeadingWhitespace &&
      bodyTokens.length &&
      bodyTokens[0].type === 'text') {
    const leadingMatch = bodyTokens[0].content.match(/^[ 　]+/)
    if (leadingMatch) {
      leadingSpaceToken = new state.Token('text', '', 0)
      leadingSpaceToken.content = leadingMatch[0]
      bodyTokens[0].content = bodyTokens[0].content.slice(leadingMatch[0].length)
      if (!bodyTokens[0].content) {
        bodyTokens.shift()
      }
    }
  }

  if (!bodyTokens.length) {
    if (leadingSpaceToken) {
      children.splice(startIndex, 0, leadingSpaceToken)
    }
    return
  }

  const bodyOpen = new state.Token('span_open', 'span', 1)
  let classPrefix = opt.classPrefix + '-'
  if (!opt.removeMarkNameInCaptionClass) {
    classPrefix += mark + '-'
  }
  bodyOpen.attrSet('class', classPrefix + 'body')
  const bodyClose = new state.Token('span_close', 'span', -1)
  const insertTokens = []
  if (leadingSpaceToken) {
    insertTokens.push(leadingSpaceToken)
  }
  insertTokens.push(bodyOpen, ...bodyTokens, bodyClose)
  children.splice(startIndex, 0, ...insertTokens)
}

export default mditPCaption
export { setCaptionParagraph, markAfterNum, joint, jointFullWidth, jointHalfWidth, markReg }
