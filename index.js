import langSets from './lang.js'

const allLangs = Object.keys(langSets)
const allLangsKey = allLangs.slice().sort().join(',')

const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}'
const joint = '[.:．。：　]'
const jointFullWidth = '[．。：　]'
const jointHalfWidth = '[.:]'
const jointChars = new Set(['.', ':', '．', '。', '：', '　'])

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

const langMarkRegCache = Object.create(null)

const getLangMarkReg = (lang) => {
  const cached = langMarkRegCache[lang]
  if (cached) return cached
  const data = langSets[lang]
  const langMarkReg = {}
  const marks = Object.keys(data.markReg)
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    let pattern = data.markReg[mark]
    if (data.type['inter-word-space']) {
      pattern = pattern.replace(/([a-z])/g, (match) => '[' + match + match.toUpperCase() + ']')
      pattern += markAfterWithSpace
    } else {
      pattern += markAfterWithoutSpace
    }
    langMarkReg[mark] = pattern
  }
  langMarkRegCache[lang] = langMarkReg
  return langMarkReg
}

const getMarkReg = (langs) => {
  const markPatterns = {}
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i]
    const langMarkReg = getLangMarkReg(lang)
    const marks = Object.keys(langMarkReg)
    for (let j = 0; j < marks.length; j++) {
      const mark = marks[j]
      if (!markPatterns[mark]) {
        markPatterns[mark] = []
      }
      markPatterns[mark].push(langMarkReg[mark])
    }
  }
  const markReg = {}
  const marks = Object.keys(markPatterns)
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    markReg[mark] = new RegExp('^(?:' + markPatterns[mark].join('|') + ')')
  }
  return markReg
}

const buildPrioritizedEntries = (markReg, markRegEntries, primaryMark, secondaryMark) => {
  const entries = []
  if (markReg[primaryMark]) {
    entries.push([primaryMark, markReg[primaryMark]])
  }
  if (secondaryMark && secondaryMark !== primaryMark && markReg[secondaryMark]) {
    entries.push([secondaryMark, markReg[secondaryMark]])
  }
  if (entries.length > 0) return entries
  return markRegEntries
}

const createMarkRegState = (langs) => {
  const resolvedMarkReg = getMarkReg(langs)
  const resolvedMarkRegEntries = Object.keys(resolvedMarkReg).map((key) => [key, resolvedMarkReg[key]])
  const singleMarkEntries = {}
  for (let i = 0; i < resolvedMarkRegEntries.length; i++) {
    const entry = resolvedMarkRegEntries[i]
    singleMarkEntries[entry[0]] = [entry]
  }
  const blockquoteOnlyEntries = resolvedMarkReg.blockquote ? [[
    'blockquote',
    resolvedMarkReg.blockquote,
  ]] : []
  const videoOnlyEntries = resolvedMarkReg.video ? [[
    'video',
    resolvedMarkReg.video,
  ]] : []
  const blockquoteWithImgEntries = buildPrioritizedEntries(
    resolvedMarkReg,
    resolvedMarkRegEntries,
    'blockquote',
    'img',
  )
  return {
    markReg: resolvedMarkReg,
    markRegEntries: resolvedMarkRegEntries,
    singleMarkEntries,
    blockquoteOnlyEntries,
    videoOnlyEntries,
    blockquoteWithImgEntries,
  }
}

const defaultMarkRegState = createMarkRegState(allLangs)
const markRegCache = new Map()

const resolveMarkRegState = (languages) => {
  if (!Array.isArray(languages)) return defaultMarkRegState
  const validLangs = []
  const seen = new Set()
  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i]
    if (!langSets[lang] || seen.has(lang)) continue
    seen.add(lang)
    validLangs.push(lang)
  }
  if (validLangs.length === 0) return defaultMarkRegState
  const normalizedLangs = validLangs.slice().sort()
  const langKey = normalizedLangs.join(',')
  if (langKey === allLangsKey) return defaultMarkRegState
  if (markRegCache.has(langKey)) return markRegCache.get(langKey)
  const state = createMarkRegState(normalizedLangs)
  markRegCache.set(langKey, state)
  return state
}

const getMarkRegStateFromOpt = (opt) => {
  if (
    opt &&
    opt.markRegState &&
    opt.markRegState.markReg &&
    Array.isArray(opt.markRegState.markRegEntries)
  ) {
    return opt.markRegState
  }
  return defaultMarkRegState
}

const defaultSetCaptionOpt = {
  markRegState: defaultMarkRegState,
  classPrefix: 'caption',
  setFigureNumber: false,
  jointSpaceUseHalfWidth: false,
  removeUnnumberedLabel: false,
  removeUnnumberedLabelExceptMarksSet: null,
  wrapCaptionBody: false,
  labelPrefixMarkerReg: null,
  labelPrefixMarkerNeedsCheckOnLikelyStart: false,
  paragraphClassByMark: null,
  captionClassByMark: null,
  removeMarkNameInCaptionClass: false,
  labelClassFollowsFigure: false,
  figureToLabelClassMap: null,
}

const resolveSetCaptionOpt = (opt) => (opt ? opt : defaultSetCaptionOpt)

const getMarkRegStateForLanguages = (languages) => resolveMarkRegState(languages)
const getMarkRegForLanguages = (languages) => resolveMarkRegState(languages).markReg
const getCandidateMarkEntries = (markRegState, captionName, spIsIframeTypeBlockquote, spIsVideoIframe) => {
  if (!markRegState || !markRegState.markReg || !markRegState.markRegEntries) return []
  if (spIsIframeTypeBlockquote && captionName !== 'blockquote') {
    return markRegState.blockquoteOnlyEntries
  }
  if (spIsVideoIframe && captionName !== 'iframe') {
    return markRegState.videoOnlyEntries
  }
  if (captionName && captionName !== 'iframe') {
    // iframe-type blockquote captions may intentionally use image labels (e.g., Figure.).
    if (spIsIframeTypeBlockquote && captionName === 'blockquote') {
      return markRegState.blockquoteWithImgEntries
    }
    return markRegState.singleMarkEntries[captionName] || markRegState.markRegEntries
  }
  return markRegState.markRegEntries
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalizeLabelPrefixMarkers = (value) => {
  if (typeof value === 'string') {
    return value ? [value] : []
  }
  if (Array.isArray(value)) {
    const normalized = value.map(entry => String(entry)).filter(Boolean)
    return normalized.length > 2 ? normalized.slice(0, 2) : normalized
  }
  return []
}
const buildLabelPrefixMarkerRegFromMarkers = (markers) => {
  if (!markers.length) return null
  const pattern = markers.map(escapeRegExp).join('|')
  return new RegExp('^(?:' + pattern + ')(?:[ \\t　]+)?')
}
const trimAsciiSpacesStart = (text) => {
  if (typeof text !== 'string' || !text) return text
  let start = 0
  while (start < text.length && text.charCodeAt(start) === 0x20) {
    start++
  }
  if (start === 0) return text
  return text.slice(start)
}
const trimAsciiSpacesEnd = (text) => {
  if (typeof text !== 'string' || !text) return text
  let end = text.length
  while (end > 0 && text.charCodeAt(end - 1) === 0x20) {
    end--
  }
  if (end === text.length) return text
  return text.slice(0, end)
}
const stripTrailingJointAndSpaces = (text, jointText) => {
  if (typeof text !== 'string' || !text || !jointText) return text
  if (text.endsWith(jointText)) {
    return trimAsciiSpacesEnd(text.slice(0, -jointText.length))
  }
  return text
}
const getTrailingJointChar = (text) => {
  if (typeof text !== 'string' || !text) return ''
  const lastChar = text.charAt(text.length - 1)
  if (jointChars.has(lastChar)) return lastChar
  return ''
}
const stripLeadingPrefix = (text, prefix) => {
  if (typeof text !== 'string' || !text || !prefix) return text
  if (text.startsWith(prefix)) return text.slice(prefix.length)
  return text
}
const stripLabelPrefixMarker = (inlineToken, markerText) => {
  if (!inlineToken || !markerText) return
  if (typeof inlineToken.content === 'string') {
    inlineToken.content = stripLeadingPrefix(inlineToken.content, markerText)
  }
  if (inlineToken.children && inlineToken.children.length) {
    for (let i = 0; i < inlineToken.children.length; i++) {
      const child = inlineToken.children[i]
      if (child && child.type === 'text' && typeof child.content === 'string') {
        child.content = stripLeadingPrefix(child.content, markerText)
        break
      }
    }
  }
}

const isAsciiAlphaCode = (code) => {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)
}

const isLikelyCaptionStart = (text) => {
  if (!text) return false
  const code = text.charCodeAt(0)
  if (code <= 0x20 || code === 0x3000) return false
  if (code <= 0x7f) return isAsciiAlphaCode(code)
  return true
}

const figureLabelSuffixStripReg = /-(?:label(?:-joint)?|body)$/
const figureBasesCacheKey = Symbol('figureLabelBasesCache')

const stripLabelSuffix = (className) => {
  if (!className || typeof className !== 'string') return ''
  return className.replace(figureLabelSuffixStripReg, '')
}

const normalizeClassBaseList = (raw) => {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : String(raw).split(/\s+/)
  return list
    .map(entry => stripLabelSuffix(entry.trim()))
    .filter(Boolean)
}

const appendSuffixIfMissing = (base, suffix) => {
  if (!base) return ''
  if (!suffix) return base
  const normalizedSuffix = '-' + suffix
  if (base.endsWith(normalizedSuffix)) return base
  return base + normalizedSuffix
}

const resolveFigureLabelBases = (sp, opt) => {
  if (!opt.labelClassFollowsFigure || !sp) return []
  const rawFigureClass = typeof sp.figureClassName === 'string' ? sp.figureClassName : ''
  if (!rawFigureClass) return []
  const trimmedFigureClass = rawFigureClass.trim()
  if (!trimmedFigureClass) return []

  const mapRef = opt.figureToLabelClassMap || null
  const cached = sp[figureBasesCacheKey]
  if (cached && cached.figureClass === trimmedFigureClass && cached.mapRef === mapRef) {
    return cached.bases
  }

  const override = mapRef && mapRef[trimmedFigureClass]
  const bases = normalizeClassBaseList(override || trimmedFigureClass)
  sp[figureBasesCacheKey] = { figureClass: trimmedFigureClass, mapRef, bases }
  return bases
}

const getDefaultLabelBase = (mark, opt) => {
  const prefix = opt.classPrefix || ''
  if (!prefix) return ''
  if (opt.removeMarkNameInCaptionClass) return prefix
  return prefix + '-' + mark
}

const buildStaticClassTables = (opt) => {
  const markReg = opt && opt.markRegState ? opt.markRegState.markReg : null
  const marks = markReg ? Object.keys(markReg) : []
  const paragraphClassByMark = Object.create(null)
  const captionClassByMark = Object.create(null)
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    paragraphClassByMark[mark] = opt.classPrefix + '-' + mark
    const base = getDefaultLabelBase(mark, opt)
    captionClassByMark[mark] = {
      label: base ? appendSuffixIfMissing(base, 'label') : '',
      'label-joint': base ? appendSuffixIfMissing(base, 'label-joint') : '',
      body: base ? appendSuffixIfMissing(base, 'body') : '',
    }
  }
  opt.paragraphClassByMark = paragraphClassByMark
  opt.captionClassByMark = captionClassByMark
}

const buildCaptionClassNames = (mark, suffix, sp, opt) => {
  const defaultBase = getDefaultLabelBase(mark, opt)
  if (!opt.labelClassFollowsFigure) {
    const staticClasses = opt.captionClassByMark && opt.captionClassByMark[mark]
    if (staticClasses && Object.prototype.hasOwnProperty.call(staticClasses, suffix)) {
      return staticClasses[suffix]
    }
    return defaultBase ? appendSuffixIfMissing(defaultBase, suffix) : ''
  }

  const classNames = []
  const figureBases = resolveFigureLabelBases(sp, opt)
  for (const base of figureBases) {
    const resolved = appendSuffixIfMissing(base, suffix)
    if (resolved) classNames.push(resolved)
  }
  if (defaultBase) {
    const resolvedDefault = appendSuffixIfMissing(defaultBase, suffix)
    if (resolvedDefault) classNames.push(resolvedDefault)
  }
  if (classNames.length === 0) return ''
  if (classNames.length === 1) return classNames[0]

  const deduped = []
  const seen = new Set()
  for (const entry of classNames) {
    if (!seen.has(entry)) {
      seen.add(entry)
      deduped.push(entry)
    }
  }
  return deduped.join(' ')
}

const mditPCaption = (md, option) => {
  const hasExplicitLabelClassFollowsFigure = option && Object.prototype.hasOwnProperty.call(option, 'labelClassFollowsFigure')
  const opt = {
    languages: ['en', 'ja'], // limit detection to lang/*.json entries; unknown codes are ignored
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
    labelClassFollowsFigure: false, // when true, reuse sp.figureClassName (or map overrides) for label/body spans
    figureToLabelClassMap: null, // optional overrides: { figureClassName: 'custom-label-base another-base' }
    labelPrefixMarker: null, // optional leading marker(s) before label, e.g. '*' or ['*', '>']
  }
  if (option) Object.assign(opt, option)
  if (!hasExplicitLabelClassFollowsFigure && opt.figureToLabelClassMap) {
    opt.labelClassFollowsFigure = true
  }
  if (Array.isArray(opt.removeUnnumberedLabelExceptMarks) && opt.removeUnnumberedLabelExceptMarks.length > 0) {
    opt.removeUnnumberedLabelExceptMarksSet = new Set(opt.removeUnnumberedLabelExceptMarks)
  } else {
    opt.removeUnnumberedLabelExceptMarksSet = null
  }
  const labelPrefixMarkers = normalizeLabelPrefixMarkers(opt.labelPrefixMarker)
  opt.labelPrefixMarkerReg = buildLabelPrefixMarkerRegFromMarkers(labelPrefixMarkers)
  opt.labelPrefixMarkerNeedsCheckOnLikelyStart = labelPrefixMarkers.some(marker => isLikelyCaptionStart(marker))

  // Resolve regex state per plugin instance and avoid mutating shared module globals.
  opt.markRegState = resolveMarkRegState(opt.languages)
  buildStaticClassTables(opt)

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
  opt = resolveSetCaptionOpt(opt)
  if (!state || !state.tokens || typeof n !== 'number' || n < 0) return caption
  const tokens = state.tokens
  if (n >= tokens.length) return caption
  if (!fNum || typeof fNum !== 'object') {
    fNum = { img: 0, table: 0 }
  }
  const token = tokens[n]
  if (!token) return caption
  if (token.type !== 'paragraph_open') return caption
  if (n > 1 && tokens[n-1].type === 'list_item_open') return caption
  const nextToken = tokens[n+1]
  if (!nextToken || nextToken.type !== 'inline') return caption
  if (!nextToken.children || nextToken.children.length === 0 || !nextToken.children[0]) return caption
  const content = typeof nextToken.content === 'string' ? nextToken.content : ''
  const contentLikelyCaption = isLikelyCaptionStart(content)
  const shouldCheckMarkerOnLikelyStart = opt.labelPrefixMarkerNeedsCheckOnLikelyStart !== false
  let markerMatch = null
  if (opt.labelPrefixMarkerReg && (!contentLikelyCaption || shouldCheckMarkerOnLikelyStart)) {
    markerMatch = opt.labelPrefixMarkerReg.exec(content)
  }
  if (!contentLikelyCaption && !markerMatch) return caption
  const matchTarget = markerMatch ? content.slice(markerMatch[0].length) : content
  if (!matchTarget) return caption
  if (markerMatch && !isLikelyCaptionStart(matchTarget)) return caption

  // caption/sp may be provided by integrators to enforce cross-block constraints
  const captionName = caption && caption.name ? caption.name : ''
  const spIsIframeTypeBlockquote = sp && sp.isIframeTypeBlockquote
  const spIsVideoIframe = sp && sp.isVideoIframe

  const markRegState = getMarkRegStateFromOpt(opt)
  const markRegEntries = getCandidateMarkEntries(markRegState, captionName, spIsIframeTypeBlockquote, spIsVideoIframe)
  for (let i = 0; i < markRegEntries.length; i++) {
    const mark = markRegEntries[i][0]
    const hasMarkLabel = markRegEntries[i][1].exec(matchTarget)
    if (!hasMarkLabel) continue

    let labelMark = ''
    let labelNum = ''
    if (hasMarkLabel[1] === undefined) {
      labelMark = hasMarkLabel[4]
      labelNum = hasMarkLabel[5]
    } else {
      labelMark = hasMarkLabel[1]
      labelNum = hasMarkLabel[2] || hasMarkLabel[3]
    }

    if (captionName) {
      if (captionName !== mark && labelMark === 'リスト') continue // for リスト sampキャプション
    }

    if (spIsIframeTypeBlockquote) {
      if (mark !== 'blockquote' && captionName !== 'blockquote') return
    } else if (spIsVideoIframe) {
      if (mark !== 'video' && captionName !== 'iframe') return
    } else if (captionName) {
      if(captionName !== 'iframe' && captionName !== mark) return
    }

    if (markerMatch) {
      stripLabelPrefixMarker(nextToken, markerMatch[0])
    }

    const actualLabel = {
      content: hasMarkLabel[0],
      mark: labelMark,
      num: labelNum,
      joint: '',
    }

    const paragraphClass = opt.paragraphClassByMark && opt.paragraphClassByMark[mark]
    token.attrJoin('class', paragraphClass || (opt.classPrefix + '-' + mark))

    if (opt.setFigureNumber && (mark === 'img' || mark === 'table')) {
      if (actualLabel.num === undefined) {
        setFigureNumber(n, state, mark, actualLabel, fNum)
      } else if (actualLabel.num > 0) {
        fNum[mark] = actualLabel.num
      }
    }

    actualLabel.joint = getTrailingJointChar(actualLabel.content)
    actualLabel.content = trimAsciiSpacesEnd(actualLabel.content)
    let convertJointSpaceFullWith = false
    if (opt.jointSpaceUseHalfWidth && actualLabel.joint === '　') {
      actualLabel.joint = ''
      convertJointSpaceFullWith = true
    }
    addLabelToken(state, nextToken, mark, actualLabel, convertJointSpaceFullWith, opt, sp)

    return
  }
}

const replaceLeadingText = (text, mark, replacement) => {
  if (typeof text !== 'string' || !text || !mark) return text
  if (text.startsWith(mark)) return replacement + text.slice(mark.length)
  return text
}

const setFigureNumber = (n, state, mark, actualLabel, fNum) => {
  const nextToken = state.tokens[n+1]
  fNum[mark]++
  let vNum = fNum[mark]
  let replacedCont = actualLabel.mark + (/^[a-zA-Z]/.test(actualLabel.mark) ? ' ' : '') + vNum
  actualLabel.num = vNum
  nextToken.content = replaceLeadingText(nextToken.content, actualLabel.mark, replacedCont)
  if (nextToken.children && nextToken.children[0]) {
    nextToken.children[0].content = replaceLeadingText(nextToken.children[0].content, actualLabel.mark, replacedCont)
  }
  actualLabel.content = replaceLeadingText(actualLabel.content, actualLabel.mark, replacedCont)
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

const addLabelToken = (state, nextToken, mark, actualLabel, convertJointSpaceFullWith, opt, sp) => {
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

  const labelClassName = buildCaptionClassNames(mark, 'label', sp, opt)
  if (labelClassName) {
    labelToken.open.attrSet('class', labelClassName)
  }
  if (opt.hasNumClass && actualLabel.num) {
    labelToken.open.attrJoin('class', 'label-has-num')
  }

  const firstContent = children[0].content
  if (firstContent.startsWith(actualLabel.content)) {
    children[0].content = firstContent.slice(actualLabel.content.length)
  } else {
    children[0].content = firstContent.replace(actualLabel.content, '')
  }
  if (convertJointSpaceFullWith) {
    if (actualLabel.content.endsWith('　')) {
      actualLabel.content = actualLabel.content.slice(0, -1)
    }
    if (children[0].content.startsWith('　')) {
      children[0].content = ' ' + children[0].content.slice(1)
    } else {
      children[0].content = ' ' + children[0].content
    }
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
    labelMeta = addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt, sp)
  } else {
    if (opt.removeUnnumberedLabel) {
      const exceptMarks = opt.removeUnnumberedLabelExceptMarksSet
      if (exceptMarks && exceptMarks.size > 0) {
        if (exceptMarks.has(mark)) {
          labelMeta = addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt, sp)
        } else {
          children[0].content = trimAsciiSpacesStart(children[0].content)
        }
      } else {
        children[0].content = trimAsciiSpacesStart(children[0].content)
      }
    } else {
      labelMeta = addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt, sp)
    }
  }
  if (opt.wrapCaptionBody) {
    wrapCaptionBody(state, nextToken, mark, labelMeta, opt, sp)
  }
  if (sp) {
    const hasExplicitNumber = actualLabel.num !== undefined && actualLabel.num !== ''
    sp.captionDecision = {
      mark,
      labelText: actualLabel.mark || '',
      hasExplicitNumber,
    }
  }
  return true
}

const addJointToken = (state, nextToken, mark, labelToken, actualLabelJoint, opt, sp) => {
  nextToken.children.splice(0, 0, labelToken.first, labelToken.open, labelToken.content, labelToken.close)
  let bodyStartIndex = 4
  if (actualLabelJoint) {
    nextToken.children[2].content = stripTrailingJointAndSpaces(nextToken.children[2].content, actualLabelJoint)

    const labelJointToken = {
      open: new state.Token('span_open', 'span', 1),
      content: new state.Token('text', '', 0),
      close: new state.Token('span_close', 'span', -1),
    }
    const jointClassName = buildCaptionClassNames(mark, 'label-joint', sp, opt)
    if (jointClassName) {
      labelJointToken.open.attrSet('class', jointClassName)
    }
    labelJointToken.content.content = actualLabelJoint

    nextToken.children.splice(3, 0, labelJointToken.open, labelJointToken.content, labelJointToken.close)
    bodyStartIndex = 7
  }
  return { bodyStartIndex }
}

const wrapCaptionBody = (state, nextToken, mark, labelMeta, opt, sp) => {
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
  const bodyClassName = buildCaptionClassNames(mark, 'body', sp, opt)
  if (bodyClassName) {
    bodyOpen.attrSet('class', bodyClassName)
  }
  const bodyClose = new state.Token('span_close', 'span', -1)
  const insertTokens = []
  if (leadingSpaceToken) {
    insertTokens.push(leadingSpaceToken)
  }
  insertTokens.push(bodyOpen, ...bodyTokens, bodyClose)
  children.splice(startIndex, 0, ...insertTokens)
}

export default mditPCaption
export {
  setCaptionParagraph,
  markAfterNum,
  joint,
  jointFullWidth,
  jointHalfWidth,
  getMarkRegStateForLanguages,
  getMarkRegForLanguages,
}
