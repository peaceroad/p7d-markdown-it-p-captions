import langSets from './lang.js'

const allLangs = Object.keys(langSets)
const allLangsKey = allLangs.join(',')

const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}'
const joint = '[.:．。：　]'
const jointFullWidth = '[．。：　]'
const jointHalfWidth = '[.:]'
const asciiLowerAlphaReg = /([a-z])/g
const labelGroupName = 'pcaptionLabel'
const numberPrimaryGroupName = 'pcaptionNumPrimary'
const numberSecondaryGroupName = 'pcaptionNumSecondary'

const markAfterSpacedLayout = '(?:' +
  ' *(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+[^0-9a-zA-Z])' +
  ')|' +
  ' *(?<' + numberPrimaryGroupName + '>' + markAfterNum + ')(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+[^a-z])|$' +
  ')|' +
  '[.](?<' + numberSecondaryGroupName + '>' + markAfterNum + ')(?:' +
    joint + '|(?=[ ]+[^a-z])|$' +
  ')' +
')'

const markAfterCompactLayout = '(?:' +
  ' *(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+)' +
  ')|' +
  ' *(?<' + numberPrimaryGroupName + '>' + markAfterNum + ')(?:' +
    jointHalfWidth + '(?:(?=[ ]+)|$)|' +
    jointFullWidth + '|' +
    '(?=[ ]+)|$' +
  ')' +
')'

const normalizeLabelLayout = (data) => {
  const type = data && data.type ? data.type : null
  const layout = type && type['label-layout']
  if (layout === 'compact' || layout === 'spaced') return layout
  throw new Error('Invalid language config: type["label-layout"] must be "spaced" or "compact".')
}

const normalizeMatchCase = (value) => {
  if (value === undefined || value === null || value === '') return 'auto'
  if (value === 'auto' || value === 'ascii' || value === 'unicode' || value === 'raw') {
    return value
  }
  throw new Error('Invalid language config: markReg entry "match-case" must be "auto", "ascii", "unicode", or "raw".')
}

const getMarkAfterPatternByLayout = (labelLayout) => (
  labelLayout === 'compact' ? markAfterCompactLayout : markAfterSpacedLayout
)

const isAsciiOnlyText = (text) => {
  if (typeof text !== 'string') return false
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) return false
  }
  return true
}

const resolveMatchCase = (pattern, matchCase) => {
  if (matchCase !== 'auto') return matchCase
  if (!isAsciiOnlyText(pattern)) return 'raw'
  return /[a-z]/.test(pattern) ? 'ascii' : 'raw'
}

const normalizeMarkPatternSpec = (entry) => {
  if (typeof entry === 'string') {
    return {
      pattern: entry,
      matchCase: 'auto',
    }
  }
  if (!entry || typeof entry !== 'object') {
    throw new Error('Invalid language config: markReg entries must be strings or { pattern, match-case }.')
  }
  const pattern = typeof entry.pattern === 'string' ? entry.pattern : ''
  if (!pattern) {
    throw new Error('Invalid language config: object markReg entries must define a non-empty pattern string.')
  }
  return {
    pattern,
    matchCase: normalizeMatchCase(entry['match-case']),
  }
}

const applyMatchCaseToPattern = (pattern, matchCase) => {
  const resolvedMatchCase = resolveMatchCase(pattern, matchCase)
  if (resolvedMatchCase === 'ascii') {
    return {
      source: pattern.replace(asciiLowerAlphaReg, (match) => '[' + match + match.toUpperCase() + ']'),
      usesUnicodeCaseFold: false,
    }
  }
  if (resolvedMatchCase === 'unicode') {
    return {
      source: pattern,
      usesUnicodeCaseFold: true,
    }
  }
  return {
    source: pattern,
    usesUnicodeCaseFold: false,
  }
}

const createMarkMatcher = (regexes) => {
  return {
    exec(text) {
      if (typeof text !== 'string') return null
      for (let i = 0; i < regexes.length; i++) {
        const regex = regexes[i]
        const match = regex.exec(text)
        if (match) return match
      }
      return null
    },
    test(text) {
      if (typeof text !== 'string') return false
      for (let i = 0; i < regexes.length; i++) {
        const regex = regexes[i]
        if (regex.test(text)) return true
      }
      return false
    },
  }
}

const langMarkSpecCache = Object.create(null)
const normalizeLanguages = (languages) => {
  if (!Array.isArray(languages)) return []
  const validLangs = []
  const seen = new Set()
  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i]
    if (!langSets[lang] || seen.has(lang)) continue
    seen.add(lang)
    validLangs.push(lang)
  }
  return validLangs
}

const getLangMarkSpec = (lang) => {
  const cached = langMarkSpecCache[lang]
  if (cached) return cached
  const data = langSets[lang]
  const labelLayout = normalizeLabelLayout(data)
  const markAfterPattern = getMarkAfterPatternByLayout(labelLayout)
  const langMarkSpec = {}
  const marks = Object.keys(data.markReg)
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    const patternSpec = normalizeMarkPatternSpec(data.markReg[mark])
    const foldedPattern = applyMatchCaseToPattern(patternSpec.pattern, patternSpec.matchCase)
    const flags = foldedPattern.usesUnicodeCaseFold ? 'iu' : ''
    langMarkSpec[mark] = new RegExp(
      '^(?<' + labelGroupName + '>' + foldedPattern.source + ')' + markAfterPattern,
      flags,
    )
  }
  langMarkSpecCache[lang] = langMarkSpec
  return langMarkSpec
}

const getMarkReg = (langs) => {
  const markPatterns = Object.create(null)
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i]
    const langMarkSpec = getLangMarkSpec(lang)
    const marks = Object.keys(langMarkSpec)
    for (let j = 0; j < marks.length; j++) {
      const mark = marks[j]
      if (!markPatterns[mark]) markPatterns[mark] = []
      markPatterns[mark].push(langMarkSpec[mark])
    }
  }
  const markReg = Object.create(null)
  const marks = Object.keys(markPatterns)
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    markReg[mark] = createMarkMatcher(markPatterns[mark])
  }
  return markReg
}

const buildDerivedGeneratedLabelDefaults = (label, labelLayout) => {
  if (typeof label !== 'string' || !label) return null
  const spaced = labelLayout === 'spaced'
  return {
    label,
    joint: spaced ? '.' : '　',
    space: spaced ? ' ' : '',
  }
}

const normalizeGeneratedLabelDefaultEntry = (entry, labelLayout) => {
  if (!entry) return null
  if (typeof entry === 'string') {
    return buildDerivedGeneratedLabelDefaults(entry, labelLayout)
  }
  const label = typeof entry.label === 'string' ? entry.label : ''
  if (!label) return null
  const derived = buildDerivedGeneratedLabelDefaults(label, labelLayout)
  return {
    label,
    joint: typeof entry.joint === 'string' ? entry.joint : derived.joint,
    space: typeof entry.space === 'string' ? entry.space : derived.space,
  }
}

const normalizeGeneratedLabelDefaultsForData = (data) => {
  if (!data) return null
  const raw = data.generatedLabelDefaults
  if (!raw) return null
  const labelLayout = normalizeLabelLayout(data)
  const normalized = Object.create(null)
  let hasEntry = false
  const marks = Object.keys(raw)
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    const entry = normalizeGeneratedLabelDefaultEntry(raw[mark], labelLayout)
    if (!entry) continue
    normalized[mark] = entry
    hasEntry = true
  }
  return hasEntry ? normalized : null
}

const langGeneratedLabelDefaultsCache = Object.create(null)

const getLangGeneratedLabelDefaults = (lang) => {
  const cached = langGeneratedLabelDefaultsCache[lang]
  if (cached !== undefined) return cached
  const generatedDefaults = normalizeGeneratedLabelDefaultsForData(langSets[lang])
  langGeneratedLabelDefaultsCache[lang] = generatedDefaults || null
  return langGeneratedLabelDefaultsCache[lang]
}

const buildPrioritizedEntries = (singleMarkEntries, markRegEntries, primaryMark, secondaryMark) => {
  const entries = []
  const primaryEntry = singleMarkEntries[primaryMark]
  if (primaryEntry && primaryEntry[0]) {
    entries.push(primaryEntry[0])
  }
  const secondaryEntry = (
    secondaryMark &&
    secondaryMark !== primaryMark &&
    singleMarkEntries[secondaryMark]
  ) ? singleMarkEntries[secondaryMark] : null
  if (secondaryEntry && secondaryEntry[0]) {
    entries.push(secondaryEntry[0])
  }
  if (entries.length > 0) return entries
  return markRegEntries
}

const createMarkRegState = (langs) => {
  const resolvedMarkReg = getMarkReg(langs)
  const resolvedMarks = Object.keys(resolvedMarkReg)
  const resolvedMarkRegEntries = []
  const singleMarkEntries = {}
  for (let i = 0; i < resolvedMarks.length; i++) {
    const mark = resolvedMarks[i]
    const entry = [mark, resolvedMarkReg[mark]]
    resolvedMarkRegEntries.push(entry)
    singleMarkEntries[mark] = [entry]
  }
  const blockquoteOnlyEntries = singleMarkEntries.blockquote || []
  const videoOnlyEntries = singleMarkEntries.video || []
  const blockquoteWithImgEntries = buildPrioritizedEntries(
    singleMarkEntries,
    resolvedMarkRegEntries,
    'blockquote',
    'img',
  )
  const generatedLabelDefaultsByLang = Object.create(null)
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i]
    const generatedDefaults = getLangGeneratedLabelDefaults(lang)
    if (!generatedDefaults) continue
    generatedLabelDefaultsByLang[lang] = generatedDefaults
  }
  const state = {
    languages: langs.slice(),
    markReg: resolvedMarkReg,
    markRegEntries: resolvedMarkRegEntries,
    singleMarkEntries,
    blockquoteOnlyEntries,
    videoOnlyEntries,
    blockquoteWithImgEntries,
    generatedLabelDefaultsByLang,
  }
  return state
}

const emptyMarkRegState = createMarkRegState([])
const defaultMarkRegState = createMarkRegState(allLangs)
const markRegCache = new Map()
const normalizedOptionKey = Symbol('pCaptionNormalizedOption')
const normalizedSetCaptionOptCache = new WeakMap()
const installedKey = Symbol.for('p7d-markdown-it-p-captions.installed')

const resolveMarkRegState = (languages) => {
  if (!Array.isArray(languages)) return defaultMarkRegState
  const validLangs = normalizeLanguages(languages)
  if (validLangs.length === 0) return emptyMarkRegState
  const langKey = validLangs.join(',')
  if (langKey === allLangsKey) return defaultMarkRegState
  const cachedState = markRegCache.get(langKey)
  if (cachedState) return cachedState
  const state = createMarkRegState(validLangs)
  markRegCache.set(langKey, state)
  return state
}

const isMarkRegState = (value) => (
  !!(
    value &&
    value.markReg &&
    Array.isArray(value.markRegEntries)
  )
)

const getMarkRegStateFromOpt = (opt) => {
  if (
    opt &&
    isMarkRegState(opt.markRegState)
  ) {
    return opt.markRegState
  }
  return defaultMarkRegState
}

const normalizeClassPrefix = (value) => {
  if (value === null || value === undefined) return 'caption'
  return String(value).trim()
}

const joinClassPrefix = (prefix, suffix) => {
  return prefix ? prefix + '-' + suffix : suffix
}

const baseSetCaptionOpt = {
  languages: ['en', 'ja'],
  classPrefix: 'caption',
  markRegState: defaultMarkRegState,
  dquoteFilename: false,
  strongFilename: false,
  hasNumClass: false,
  bLabel: false,
  strongLabel: false,
  setFigureNumber: false,
  jointSpaceUseHalfWidth: false,
  removeUnnumberedLabel: false,
  removeUnnumberedLabelExceptMarks: [],
  removeUnnumberedLabelExceptMarksSet: null,
  wrapCaptionBody: false,
  labelPrefixMarkerReg: null,
  labelPrefixMarker: null,
  labelPrefixMarkerNeedsCheckOnLikelyStart: false,
  paragraphClassByMark: null,
  captionClassByMark: null,
  removeMarkNameInCaptionClass: false,
  labelClassFollowsFigure: false,
  figureToLabelClassMap: null,
}

const defaultSetCaptionOpt = Object.assign({}, baseSetCaptionOpt)
const baseSetCaptionOptKeys = Object.keys(baseSetCaptionOpt)

const resolveSetCaptionOpt = (opt) => {
  if (!opt || typeof opt !== 'object') return defaultSetCaptionOpt
  if (opt[normalizedOptionKey]) return opt
  const cached = normalizedSetCaptionOptCache.get(opt)
  if (cached) return cached

  const hasConfiguredLabelClassFollowsFigure = 'labelClassFollowsFigure' in opt
  const normalized = Object.assign({}, baseSetCaptionOpt)
  for (let i = 0; i < baseSetCaptionOptKeys.length; i++) {
    const key = baseSetCaptionOptKeys[i]
    if (key in opt) normalized[key] = opt[key]
  }
  normalized.classPrefix = normalizeClassPrefix(normalized.classPrefix)
  if (!hasConfiguredLabelClassFollowsFigure && normalized.figureToLabelClassMap) {
    normalized.labelClassFollowsFigure = true
  }
  if (
    Array.isArray(normalized.removeUnnumberedLabelExceptMarks) &&
    normalized.removeUnnumberedLabelExceptMarks.length > 0
  ) {
    normalized.removeUnnumberedLabelExceptMarksSet = new Set(normalized.removeUnnumberedLabelExceptMarks)
  } else {
    normalized.removeUnnumberedLabelExceptMarksSet = null
  }

  const labelPrefixMarkers = normalizeLabelPrefixMarkers(normalized.labelPrefixMarker)
  normalized.labelPrefixMarkerReg = buildLabelPrefixMarkerRegFromMarkers(labelPrefixMarkers)
  normalized.labelPrefixMarkerNeedsCheckOnLikelyStart = labelPrefixMarkers.some(marker => isLikelyCaptionStart(marker))
  normalized.markRegState = isMarkRegState(opt.markRegState)
    ? opt.markRegState
    : resolveMarkRegState(normalized.languages)
  buildStaticClassTables(normalized)
  normalized[normalizedOptionKey] = true
  normalizedSetCaptionOptCache.set(opt, normalized)
  return normalized
}

const getMarkRegStateForLanguages = (languages) => resolveMarkRegState(languages)
const getMarkRegForLanguages = (languages) => resolveMarkRegState(languages).markReg
const isJapaneseCharCode = (code) => {
  return (
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0x31f0 && code <= 0x31ff) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xff66 && code <= 0xff9f)
  )
}
const isSentenceBoundaryChar = (char) => {
  return char === '.' || char === '!' || char === '?' || char === '。' || char === '！' || char === '？'
}
const hasGeneratedDefaultForMark = (generatedDefaultsByLang, lang, mark) => {
  if (!lang) return false
  const generatedDefaults = generatedDefaultsByLang[lang]
  return !!(generatedDefaults && generatedDefaults[mark])
}
const resolvePreferredGeneratedLabelLanguages = (mark, state, preferredLanguages) => {
  const generatedDefaultsByLang = state.generatedLabelDefaultsByLang
  const baseLanguages = state.languages
  let tieBreakLanguages = baseLanguages
  if (Array.isArray(preferredLanguages) && preferredLanguages.length > 0) {
    const normalizedPreferred = normalizeLanguages(preferredLanguages)
    if (normalizedPreferred.length > 0) {
      const allowed = new Set(baseLanguages)
      const ordered = []
      const seen = new Set()
      for (let i = 0; i < normalizedPreferred.length; i++) {
        const lang = normalizedPreferred[i]
        if (!allowed.has(lang) || seen.has(lang)) continue
        seen.add(lang)
        ordered.push(lang)
      }
      for (let i = 0; i < baseLanguages.length; i++) {
        const lang = baseLanguages[i]
        if (seen.has(lang)) continue
        ordered.push(lang)
      }
      tieBreakLanguages = ordered
    }
  }
  const candidates = []
  for (let i = 0; i < tieBreakLanguages.length; i++) {
    const lang = tieBreakLanguages[i]
    if (hasGeneratedDefaultForMark(generatedDefaultsByLang, lang, mark)) {
      candidates.push(lang)
    }
  }
  return candidates
}
const detectFallbackLanguageForText = (text, markRegState, mark, preferredLanguages = null) => {
  const state = (
    markRegState &&
    markRegState.generatedLabelDefaultsByLang
  ) ? markRegState : defaultMarkRegState
  const candidateLanguages = resolvePreferredGeneratedLabelLanguages(mark, state, preferredLanguages)
  if (candidateLanguages.length === 0) return ''
  if (candidateLanguages.length === 1) return candidateLanguages[0]
  const allowJapanese = candidateLanguages.indexOf('ja') !== -1
  if (!allowJapanese) return candidateLanguages[0]
  const target = (text || '').trim()
  if (!target) return candidateLanguages[0]
  for (let i = 0; i < target.length; i++) {
    const char = target[i]
    const code = target.charCodeAt(i)
    if (allowJapanese && isJapaneseCharCode(code)) {
      return 'ja'
    }
    if (isSentenceBoundaryChar(char) || char === '\n') break
  }
  return candidateLanguages[0]
}
const getGeneratedLabelDefaults = (mark, text, markRegState, preferredLanguages = null) => {
  if (!mark) return null
  const state = (
    markRegState &&
    markRegState.generatedLabelDefaultsByLang
  ) ? markRegState : defaultMarkRegState
  const lang = detectFallbackLanguageForText(text, state, mark, preferredLanguages)
  if (!lang) return null
  const generatedDefaults = state.generatedLabelDefaultsByLang[lang]
  if (!generatedDefaults) return null
  return generatedDefaults[mark] || null
}
const getFallbackLabelForText = (mark, text, markRegState, preferredLanguages = null) => {
  const defaults = getGeneratedLabelDefaults(mark, text, markRegState, preferredLanguages)
  return defaults && defaults.label ? defaults.label : ''
}
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
    const normalized = value.filter(entry => typeof entry === 'string' && entry)
    return normalized.length > 2 ? normalized.slice(0, 2) : normalized
  }
  return []
}
const buildLabelPrefixMarkerRegFromMarkers = (markers) => {
  if (!Array.isArray(markers) || !markers.length) return null
  const markerList = markers.filter(entry => typeof entry === 'string' && entry)
  if (!markerList.length) return null
  const pattern = markerList
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
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
const getLeadingSpaceLength = (text) => {
  if (typeof text !== 'string' || !text) return 0
  let index = 0
  while (index < text.length) {
    const char = text.charCodeAt(index)
    if (char !== 0x20 && char !== 0x3000) break
    index++
  }
  return index
}
const getTrailingJointChar = (text) => {
  if (typeof text !== 'string' || !text) return ''
  const lastChar = text.charAt(text.length - 1)
  if (
    lastChar === '.' ||
    lastChar === ':' ||
    lastChar === '．' ||
    lastChar === '。' ||
    lastChar === '：' ||
    lastChar === '　'
  ) {
    return lastChar
  }
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

const decodeCaptionMatch = (match) => {
  if (!match) {
    return {
      labelText: '',
      number: undefined,
    }
  }
  const groups = match.groups
  if (!groups || groups[labelGroupName] === undefined) {
    return {
      labelText: '',
      number: undefined,
    }
  }
  return {
    labelText: groups[labelGroupName] || '',
    number: groups[numberPrimaryGroupName] || groups[numberSecondaryGroupName],
  }
}

const buildLabelClassLookup = (opt) => {
  const classPrefix = normalizeClassPrefix(opt && 'classPrefix' in opt ? opt.classPrefix : 'caption')
  const defaultClasses = [joinClassPrefix(classPrefix, 'label')]
  const withType = (type) => {
    if (opt && opt.removeMarkNameInCaptionClass) return defaultClasses
    return [joinClassPrefix(classPrefix, type + '-label'), ...defaultClasses]
  }
  return {
    img: withType('img'),
    table: withType('table'),
    default: defaultClasses,
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

const getAnalyzeCaptionMarkerReg = (options) => {
  if (options && options.labelPrefixMarkerReg) {
    return {
      reg: options.labelPrefixMarkerReg,
      needsCheckOnLikelyStart: options.labelPrefixMarkerNeedsCheckOnLikelyStart !== false,
    }
  }
  const markers = normalizeLabelPrefixMarkers(options && options.labelPrefixMarker)
  if (!markers.length) return { reg: null, needsCheckOnLikelyStart: false }
  return {
    reg: buildLabelPrefixMarkerRegFromMarkers(markers),
    needsCheckOnLikelyStart: markers.some(marker => isLikelyCaptionStart(marker)),
  }
}

const getAnalyzeCaptionEntries = (markRegState, options) => {
  if (Array.isArray(options && options.allowedMarks) && options.allowedMarks.length > 0) {
    const entries = []
    const seen = new Set()
    for (let i = 0; i < options.allowedMarks.length; i++) {
      const mark = options.allowedMarks[i]
      if (!mark || seen.has(mark)) continue
      seen.add(mark)
      const singleEntry = markRegState.singleMarkEntries[mark]
      if (singleEntry && singleEntry[0]) entries.push(singleEntry[0])
    }
    return entries
  }
  if (options && options.preferredMark) {
    return markRegState.singleMarkEntries[options.preferredMark] || []
  }
  return getCandidateMarkEntries(
    markRegState,
    options && options.captionName ? options.captionName : '',
    !!(options && options.isIframeTypeBlockquote),
    !!(options && options.isVideoIframe),
  )
}

const analyzeCaptionStart = (text, options = null) => {
  if (typeof text !== 'string' || !text) return null
  const markRegState = getMarkRegStateFromOpt(options)
  const contentLikelyCaption = isLikelyCaptionStart(text)
  const markerConfig = getAnalyzeCaptionMarkerReg(options)
  let markerMatch = null
  if (markerConfig.reg && (!contentLikelyCaption || markerConfig.needsCheckOnLikelyStart)) {
    markerMatch = markerConfig.reg.exec(text)
  }
  if (!contentLikelyCaption && !markerMatch) return null
  const matchTarget = markerMatch ? text.slice(markerMatch[0].length) : text
  if (!matchTarget) return null
  if (markerMatch && !isLikelyCaptionStart(matchTarget)) return null

  const entries = getAnalyzeCaptionEntries(markRegState, options)
  for (let i = 0; i < entries.length; i++) {
    const mark = entries[i][0]
    const match = entries[i][1].exec(matchTarget)
    if (!match) continue

    const decoded = decodeCaptionMatch(match)
    if (options && options.captionName) {
      if (options.captionName !== mark && decoded.labelText === 'リスト') continue
    }

    const matchedText = trimAsciiSpacesEnd(match[0])
    const joint = getTrailingJointChar(matchedText)
    const bodyText = trimAsciiSpacesStart(matchTarget.slice(match[0].length))
    const number = decoded.number || ''

    return {
      mark,
      kind: bodyText ? 'caption' : 'label-only',
      matchedText,
      labelText: decoded.labelText,
      number,
      joint,
      bodyText,
      hasExplicitNumber: decoded.number !== undefined && decoded.number !== '',
      prefixMarker: markerMatch ? markerMatch[0] : '',
    }
  }
  return null
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

const buildParagraphClassName = (mark, opt) => joinClassPrefix(opt.classPrefix, mark)

const buildDefaultCaptionClassName = (mark, suffix, opt) => {
  const classSuffix = opt.removeMarkNameInCaptionClass ? suffix : mark + '-' + suffix
  return joinClassPrefix(opt.classPrefix, classSuffix)
}

const buildStaticClassTables = (opt) => {
  const markReg = opt && opt.markRegState ? opt.markRegState.markReg : null
  const marks = markReg ? Object.keys(markReg) : []
  const paragraphClassByMark = Object.create(null)
  const captionClassByMark = Object.create(null)
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    paragraphClassByMark[mark] = buildParagraphClassName(mark, opt)
    captionClassByMark[mark] = {
      label: buildDefaultCaptionClassName(mark, 'label', opt),
      'label-joint': buildDefaultCaptionClassName(mark, 'label-joint', opt),
      body: buildDefaultCaptionClassName(mark, 'body', opt),
    }
  }
  opt.paragraphClassByMark = paragraphClassByMark
  opt.captionClassByMark = captionClassByMark
}

const buildCaptionClassNames = (mark, suffix, sp, opt) => {
  if (!opt.labelClassFollowsFigure) {
    const staticClasses = opt.captionClassByMark && opt.captionClassByMark[mark]
    if (staticClasses && Object.prototype.hasOwnProperty.call(staticClasses, suffix)) {
      return staticClasses[suffix]
    }
    return buildDefaultCaptionClassName(mark, suffix, opt)
  }

  const figureBases = resolveFigureLabelBases(sp, opt)
  const defaultClassName = buildDefaultCaptionClassName(mark, suffix, opt)
  if (figureBases.length === 0) {
    return defaultClassName
  }
  if (figureBases.length === 1) {
    const figureClassName = appendSuffixIfMissing(figureBases[0], suffix)
    if (!defaultClassName || defaultClassName === figureClassName) return figureClassName
    return figureClassName + ' ' + defaultClassName
  }

  const classNames = []
  const seen = new Set()
  for (let i = 0; i < figureBases.length; i++) {
    const resolved = appendSuffixIfMissing(figureBases[i], suffix)
    if (!resolved || seen.has(resolved)) continue
    seen.add(resolved)
    classNames.push(resolved)
  }
  if (defaultClassName && !seen.has(defaultClassName)) {
    classNames.push(defaultClassName)
  }
  if (classNames.length === 0) return ''
  if (classNames.length === 1) return classNames[0]
  return classNames.join(' ')
}

const mditPCaption = (md, option) => {
  if (md[installedKey]) return
  Object.defineProperty(md, installedKey, {
    value: true,
    configurable: true,
  })

  // Resolve regex/options once per plugin instance and avoid mutating shared module globals.
  const opt = resolveSetCaptionOpt(option || {})

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
  if (!state || !state.tokens || typeof n !== 'number' || n < 0) return false
  const tokens = state.tokens
  if (n >= tokens.length) return false
  if (!fNum || typeof fNum !== 'object') {
    fNum = { img: 0, table: 0 }
  }
  const token = tokens[n]
  if (!token) return false
  if (token.type !== 'paragraph_open') return false
  if (n > 1 && tokens[n-1].type === 'list_item_open') return false
  const nextToken = tokens[n+1]
  if (!nextToken || nextToken.type !== 'inline') return false
  if (!nextToken.children || nextToken.children.length === 0 || !nextToken.children[0]) return false
  const content = typeof nextToken.content === 'string' ? nextToken.content : ''

  // caption/sp may be provided by integrators to enforce cross-block constraints
  const captionName = caption && caption.name ? caption.name : ''
  const spIsIframeTypeBlockquote = sp && sp.isIframeTypeBlockquote
  const spIsVideoIframe = sp && sp.isVideoIframe

  const analysis = analyzeCaptionStart(content, {
    markRegState: getMarkRegStateFromOpt(opt),
    captionName,
    isIframeTypeBlockquote: spIsIframeTypeBlockquote,
    isVideoIframe: spIsVideoIframe,
    labelPrefixMarkerReg: opt.labelPrefixMarkerReg,
    labelPrefixMarkerNeedsCheckOnLikelyStart: opt.labelPrefixMarkerNeedsCheckOnLikelyStart,
  })
  if (!analysis) return false

  if (analysis.prefixMarker) {
    stripLabelPrefixMarker(nextToken, analysis.prefixMarker)
  }

  const actualLabel = {
    content: analysis.matchedText,
    mark: analysis.labelText,
    num: analysis.number,
    joint: analysis.joint,
  }

  const paragraphClass = opt.paragraphClassByMark && opt.paragraphClassByMark[analysis.mark]
  token.attrJoin('class', paragraphClass || buildParagraphClassName(analysis.mark, opt))

  if (opt.setFigureNumber && (analysis.mark === 'img' || analysis.mark === 'table')) {
    if (actualLabel.num === '') {
      actualLabel.num = undefined
    }
    if (actualLabel.num === undefined) {
      setFigureNumber(n, state, analysis.mark, actualLabel, fNum)
    } else if (actualLabel.num > 0) {
      fNum[analysis.mark] = actualLabel.num
    }
  }

  let convertJointSpaceFullWith = false
  if (opt.jointSpaceUseHalfWidth && actualLabel.joint === '　') {
    actualLabel.joint = ''
    convertJointSpaceFullWith = true
  }
  return addLabelToken(state, nextToken, analysis.mark, actualLabel, convertJointSpaceFullWith, opt, sp)
}

const replaceLeadingText = (text, mark, replacement) => {
  if (typeof text !== 'string' || !text || !mark) return text
  if (text.startsWith(mark)) return replacement + text.slice(mark.length)
  return text
}

const setFigureNumber = (n, state, mark, actualLabel, fNum) => {
  const nextToken = state.tokens[n+1]
  const vNum = ++fNum[mark]
  const markCode = actualLabel.mark ? actualLabel.mark.charCodeAt(0) : 0
  const replacedCont = actualLabel.mark + (isAsciiAlphaCode(markCode) ? ' ' : '') + vNum
  actualLabel.num = vNum
  nextToken.content = replaceLeadingText(nextToken.content, actualLabel.mark, replacedCont)
  if (nextToken.children && nextToken.children[0]) {
    nextToken.children[0].content = replaceLeadingText(nextToken.children[0].content, actualLabel.mark, replacedCont)
  }
  actualLabel.content = replaceLeadingText(actualLabel.content, actualLabel.mark, replacedCont)
  return
}

const setFilename = (state, nextToken, mark, opt) => {
  if (!nextToken || !nextToken.children || !nextToken.children[0]) return
  const firstChild = nextToken.children[0]
  if (typeof firstChild.content !== 'string') return
  if (firstChild.content.indexOf('"') === -1) return
  const filename = firstChild.content.match(/^([ 　]*?)"(\S.*?)"([ 　]+|$)/)
  if (!filename) return
  firstChild.content = filename[3] + firstChild.content.slice(filename[0].length)

  const beforeFilenameToken = new state.Token('text', '', 0)
  beforeFilenameToken.content = filename[1]
  const filenameTokenOpen = new state.Token('strong_open', 'strong', 1)
  filenameTokenOpen.attrSet('class', buildParagraphClassName(mark + '-filename', opt))
  const filenameTokenContent = new state.Token('text', '', 0)
  filenameTokenContent.content = filename[2]
  const filenameTokenClose = new state.Token('strong_close', 'strong', -1)

  nextToken.children.splice(0, 0, beforeFilenameToken, filenameTokenOpen, filenameTokenContent, filenameTokenClose)
  return
}

const shouldRenderUnnumberedLabel = (mark, opt) => {
  if (!opt.removeUnnumberedLabel) return true
  const exceptMarks = opt.removeUnnumberedLabelExceptMarksSet
  return !!(exceptMarks && exceptMarks.has(mark))
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
        children[1].attrJoin('class', buildParagraphClassName(mark + '-filename', opt))
      }
    }
  }

  if (opt.dquoteFilename) {
    setFilename(state, nextToken, mark, opt)
  }

  if (actualLabel.num || shouldRenderUnnumberedLabel(mark, opt)) {
    labelMeta = addJointToken(state, nextToken, mark, labelToken, actualLabel.joint, opt, sp)
  } else {
    children[0].content = trimAsciiSpacesStart(children[0].content)
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
    const leadingSpaceLength = getLeadingSpaceLength(bodyTokens[0].content)
    if (leadingSpaceLength > 0) {
      leadingSpaceToken = new state.Token('text', '', 0)
      leadingSpaceToken.content = bodyTokens[0].content.slice(0, leadingSpaceLength)
      bodyTokens[0].content = bodyTokens[0].content.slice(leadingSpaceLength)
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
  analyzeCaptionStart,
  buildLabelClassLookup,
  buildLabelPrefixMarkerRegFromMarkers,
  normalizeLabelPrefixMarkers,
  setCaptionParagraph,
  markAfterNum,
  joint,
  jointFullWidth,
  jointHalfWidth,
  getGeneratedLabelDefaults,
  getFallbackLabelForText,
  getMarkRegStateForLanguages,
  getMarkRegForLanguages,
  stripLabelPrefixMarker,
}
