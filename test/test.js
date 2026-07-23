import assert from 'assert'
import fs from 'fs'
import path from 'path'
import mdit from 'markdown-it'
import Token from 'markdown-it/lib/token.mjs'
import { fileURLToPath } from 'url'

import mditPCaption, {
  analyzeCaptionParagraph,
  analyzeCaptionStart,
  applyCaptionParagraph,
  buildLabelClassLookup,
  buildLabelPrefixMarkerRegFromMarkers,
  canonicalizeCaptionNumberingMark,
  createCaptionNumberingPolicy,
  createCaptionNumberingRuntime,
  getGeneratedLabelDefaults,
  getFallbackLabelForText,
  getMarkRegForLanguages,
  getMarkRegStateForLanguages,
  isCaptionLabelBoundary,
  isCaptionLabelForMark,
  normalizeAutoLabelNumberSets,
  normalizeLabelPrefixMarkers,
  setCaptionParagraph,
  stripLabelPrefixMarker,
} from '../index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const createMd = (options) => {
  if (options) {
    return mdit().use(mditPCaption, options)
  }
  return mdit().use(mditPCaption)
}

const suites = [
  { name: 'no-option', file: 'examples-no-option.txt' },
  { name: 'class-prefix', file: 'examples-class-prefix.txt', options: { classPrefix: 'f' } },
  { name: 'dquote-filename', file: 'examples-dquote-filename.txt', options: { dquoteFilename: true } },
  { name: 'strong-filename', file: 'examples-strong-filename.txt', options: { strongFilename: true } },
  { name: 'has-num-class', file: 'examples-has-num-class.txt', options: { hasNumClass: true } },
  { name: 'b-label', file: 'examples-b-label.txt', options: { bLabel: true } },
  { name: 'strong-label', file: 'examples-strong-label.txt', options: { strongLabel: true } },
  { name: 'label-prefix-marker', file: 'examples-label-prefix-marker.txt', options: { labelPrefixMarker: '▼' } },
  {
    name: 'label-prefix-marker-array',
    file: 'examples-label-prefix-marker-array.txt',
    options: { labelPrefixMarker: ['▼', '▲'] },
  },
  {
    name: 'label-prefix-marker-array-three',
    file: 'examples-label-prefix-marker-array-three.txt',
    options: { labelPrefixMarker: ['▼', '▲', '◇'] },
  },
  { name: 'joint-space-use-half-width', file: 'examples-joint-space-use-half-width.txt', options: { jointSpaceUseHalfWidth: true } },
  { name: 'remove-unnumbered-label', file: 'examples-remove-unnumbered-label.txt', options: { removeUnnumberedLabel: true } },
  { name: 'remove-unnumbered-label-except-blockquote', file: 'examples-remove-unnumbered-label-except-blockquote.txt', options: { removeUnnumberedLabelExceptMarks: ['blockquote'] } },
  {
    name: 'remove-unnumbered-label-except-marks',
    file: 'examples-remove-unnumbered-label-except-marks.txt',
    options: {
      removeUnnumberedLabel: true,
      removeUnnumberedLabelExceptMarks: ['blockquote'],
    },
  },
  { name: 'set-figure-number', file: 'examples-set-figure-number.txt', options: { setFigureNumber: true } },
  { name: 'wrap-caption-body', file: 'examples-wrap-caption-body.txt', options: { wrapCaptionBody: true } },
  {
    name: 'wrap-caption-body-remove-label',
    file: 'examples-wrap-caption-body-remove-label.txt',
    options: { wrapCaptionBody: true, removeUnnumberedLabel: true, removeMarkNameInCaptionClass: true },
  },
].map((suite) => ({
  ...suite,
  md: createMd(suite.options),
}))

const parserForState = mdit()
// Mirrors the default plugin options; used when calling setCaptionParagraph directly
const baseOptionForSetCaption = {
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

const normalizeContent = (text) => text.replace(/\r\n/g, '\n')

const loadExamples = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log('No exist: ' + filePath)
    return []
  }
  const raw = normalizeContent(fs.readFileSync(filePath, 'utf8'))
  const sections = raw.split(/\n*\[Markdown\]\n/).slice(1).filter(Boolean)
  return sections.map((section) => {
    const [markdownPart, htmlPart = ''] = section.split(/\n+\[HTML\]\n/)
    const html = htmlPart.endsWith('\n') ? htmlPart : htmlPart + '\n'
    return {
      markdown: markdownPart,
      html,
    }
  })
}

const runSuite = (suite) => {
  const filePath = path.join(__dirname, suite.file)
  console.log('===========================================================')
  console.log(`${suite.name}: ${filePath}`)
  const examples = loadExamples(filePath)
  if (examples.length === 0) return true
  let ok = true
  examples.forEach((example, idx) => {
    const actual = suite.md.render(example.markdown)
    try {
      assert.strictEqual(actual, example.html)
    } catch (err) {
      ok = false
      console.log(`Test ${idx + 1} >>>`)
      console.log(example.markdown)
      console.log('incorrect:')
      console.log('H: ' + actual + 'C: ' + example.html)
      console.log('H length:', actual.length, 'C length:', example.html.length)
    }
  })
  return ok
}

let pass = true
suites.forEach((suite) => {
  pass = runSuite(suite) && pass
})

const runPluginOptionNormalizationTests = () => {
  let ok = true
  const assertRender = (name, md, markdown, expected) => {
    try {
      assert.strictEqual(md.render(markdown), expected)
    } catch (err) {
      ok = false
      console.log(`plugin option normalization test "${name}" failed.`)
      console.log(err)
    }
  }

  assertRender(
    'empty classPrefix',
    mdit().use(mditPCaption, { classPrefix: '' }),
    'Figure. A caption.',
    '<p class="img"><span class="img-label">Figure<span class="img-label-joint">.</span></span> A caption.</p>\n',
  )
  assertRender(
    'trimmed classPrefix',
    mdit().use(mditPCaption, { classPrefix: ' f ' }),
    'Figure. A caption.',
    '<p class="f-img"><span class="f-img-label">Figure<span class="f-img-label-joint">.</span></span> A caption.</p>\n',
  )
  assertRender(
    'null classPrefix falls back',
    mdit().use(mditPCaption, { classPrefix: null }),
    'Figure. A caption.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> A caption.</p>\n',
  )
  assertRender(
    'undefined classPrefix falls back',
    mdit().use(mditPCaption, { classPrefix: undefined }),
    'Figure. A caption.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> A caption.</p>\n',
  )
  assertRender(
    'duplicate use is ignored',
    mdit().use(mditPCaption).use(mditPCaption),
    'Figure. A caption.',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> A caption.</p>\n',
  )
  assertRender(
    'prefix marker longest first',
    mdit().use(mditPCaption, { labelPrefixMarker: ['*', '**'] }),
    '** Figure. Caption',
    '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> Caption</p>\n',
  )
  assertRender(
    'empty classPrefix dquote filename',
    mdit().use(mditPCaption, { classPrefix: '', dquoteFilename: true }),
    'Code. "File.js" body',
    '<p class="pre-code"><span class="pre-code-label">Code<span class="pre-code-label-joint">.</span></span> <strong class="pre-code-filename">File.js</strong> body</p>\n',
  )
  assertRender(
    'empty classPrefix strong filename',
    mdit().use(mditPCaption, { classPrefix: '', strongFilename: true }),
    'Code. **File.js** body',
    '<p class="pre-code"><span class="pre-code-label">Code<span class="pre-code-label-joint">.</span></span> <strong class="pre-code-filename">File.js</strong> body</p>\n',
  )
  assertRender(
    'empty classPrefix without mark label class',
    mdit().use(mditPCaption, { classPrefix: '', removeMarkNameInCaptionClass: true, wrapCaptionBody: true }),
    'Figure. A caption.',
    '<p class="img"><span class="label">Figure<span class="label-joint">.</span></span> <span class="body">A caption.</span></p>\n',
  )
  assertRender(
    'strongLabel takes precedence over bLabel',
    mdit().use(mditPCaption, { bLabel: true, strongLabel: true }),
    'Figure. A caption.',
    '<p class="caption-img"><strong class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></strong> A caption.</p>\n',
  )
  assertRender(
    'unsupported languages stay disabled',
    mdit().use(mditPCaption, { languages: ['fr'] }),
    'Figure. A caption.',
    '<p>Figure. A caption.</p>\n',
  )

  return ok
}

pass = runPluginOptionNormalizationTests() && pass

// Clone defaults and parse markdown to ensure caption helper sees a realistic state
const cloneBaseOption = () => JSON.parse(JSON.stringify(baseOptionForSetCaption))
const createStateForMarkdown = (markdown) => ({
  tokens: parserForState.parse(markdown, {}),
  Token,
})

// Helper that applying setCaptionParagraph to the first paragraph token simulates
// what figure-with-caption does and lets us assert the gating behaviors.
const applySetCaption = (markdown, caption, sp, opt = cloneBaseOption()) => {
  const state = createStateForMarkdown(markdown)
  const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
  if (paragraphIndex === -1) {
    throw new Error('No paragraph_open token found for markdown: ' + markdown)
  }
  const fNum = { img: 0, table: 0 }
  const result = setCaptionParagraph(paragraphIndex, state, caption, fNum, sp, opt)
  return { state, paragraphIndex, result }
}

// Run targeted tests that exercise the caption/sp guards and exported behavior.
const runSetCaptionParagraphTests = () => {
  let ok = true
  const runCase = (name, markdown, captionArg, spArg, expectedClass) => {
    const caption = captionArg ? { ...captionArg } : captionArg
    const sp = spArg ? { ...spArg } : spArg
    const { state, paragraphIndex, result } = applySetCaption(markdown, caption, sp)
    const actualClass = state.tokens[paragraphIndex].attrGet('class') || null
    try {
      assert.strictEqual(actualClass, expectedClass)
      assert.strictEqual(result, !!expectedClass)
      if (captionArg) assert.strictEqual(caption.name, captionArg.name)
      if (spArg && Object.prototype.hasOwnProperty.call(spArg, 'isVideoIframe')) {
        assert.strictEqual(sp.isVideoIframe, spArg.isVideoIframe)
      }
      if (spArg && Object.prototype.hasOwnProperty.call(spArg, 'isIframeTypeBlockquote')) {
        assert.strictEqual(sp.isIframeTypeBlockquote, spArg.isIframeTypeBlockquote)
      }
    } catch (err) {
      ok = false
      console.log(`setCaptionParagraph test "${name}" failed.`)
      console.log('Markdown:', markdown)
      console.log('Expected class:', expectedClass, 'Actual class:', actualClass)
    }
  }

  runCase('default detection', 'Figure. A cat.\n', undefined, undefined, 'caption-img')
  runCase('caption guard mismatch', 'Figure. A cat.\n', { name: 'table' }, undefined, null)
  runCase('blockquote guard matches', 'Quote. Cite.\n', { name: 'blockquote' }, { isIframeTypeBlockquote: true }, 'caption-blockquote')
  runCase('blockquote guard mismatch', 'Figure. A cat.\n', undefined, { isIframeTypeBlockquote: true }, null)
  runCase('video iframe allowed', 'Video. Clip.\n', { name: 'iframe' }, { isVideoIframe: true }, 'caption-video')
  runCase('video iframe mismatch', 'Figure. A cat.\n', { name: 'img' }, { isVideoIframe: true }, null)

  const runDecisionCase = (name, markdown, optOverrides, expectedDecision) => {
    const sp = {}
    const opt = Object.assign(cloneBaseOption(), optOverrides || {})
    const { state, paragraphIndex, result } = applySetCaption(markdown, undefined, sp, opt)
    const actualClass = state.tokens[paragraphIndex].attrGet('class') || null
    try {
      assert.strictEqual(result, true)
      assert.strictEqual(actualClass, 'caption-img')
      assert.deepStrictEqual(sp.captionDecision, expectedDecision)
    } catch (err) {
      ok = false
      console.log(`setCaptionParagraph decision test "${name}" failed.`)
      console.log('Markdown:', markdown)
      console.log('Expected decision:', expectedDecision)
      console.log('Actual decision:', sp.captionDecision)
      console.log('Actual class:', actualClass)
    }
  }

  runDecisionCase(
    'captionDecision unnumbered',
    'Figure. A cat.\n',
    null,
    {
      paragraphIndex: 0,
      inlineIndex: 1,
      mark: 'img',
      kind: 'caption',
      matchedText: 'Figure.',
      labelText: 'Figure',
      number: '',
      joint: '.',
      bodyText: 'A cat.',
      hasExplicitNumber: false,
      prefixMarker: '',
    },
  )
  runDecisionCase(
    'captionDecision numbered',
    'Figure 2. A cat.\n',
    null,
    {
      paragraphIndex: 0,
      inlineIndex: 1,
      mark: 'img',
      kind: 'caption',
      matchedText: 'Figure 2.',
      labelText: 'Figure',
      number: '2',
      joint: '.',
      bodyText: 'A cat.',
      hasExplicitNumber: true,
      prefixMarker: '',
    },
  )
  runDecisionCase(
    'captionDecision preserved when label removed',
    'Figure. A cat.\n',
    { removeUnnumberedLabel: true },
    {
      paragraphIndex: 0,
      inlineIndex: 1,
      mark: 'img',
      kind: 'caption',
      matchedText: 'Figure.',
      labelText: 'Figure',
      number: '',
      joint: '.',
      bodyText: 'A cat.',
      hasExplicitNumber: false,
      prefixMarker: '',
    },
  )

  try {
    const state = createStateForMarkdown('Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const fNum = { img: 0, table: 0 }
    const result = setCaptionParagraph(paragraphIndex, state, null, fNum, null, undefined)
    const actualClass = state.tokens[paragraphIndex].attrGet('class') || null
    assert.strictEqual(result, true)
    assert.strictEqual(actualClass, 'caption-img')
  } catch (err) {
    ok = false
    console.log('setCaptionParagraph test "undefined opt fallback" failed.')
  }

  try {
    const state = createStateForMarkdown('Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const fNum = { img: 0, table: 0 }
    const result = setCaptionParagraph(paragraphIndex, state, null, fNum, null, {
      markRegState: getMarkRegStateForLanguages(['en']),
    })
    const actualClass = state.tokens[paragraphIndex].attrGet('class') || null
    assert.strictEqual(result, true)
    assert.strictEqual(actualClass, 'caption-img')
  } catch (err) {
    ok = false
    console.log('setCaptionParagraph test "partial opt fallback" failed.')
  }

  try {
    const state = createStateForMarkdown('Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const fNum = { img: 0, table: 0 }
    const sp = { figureClassName: 'figure-img' }
    const result = setCaptionParagraph(paragraphIndex, state, null, fNum, sp, {
      figureToLabelClassMap: { 'figure-img': 'media-figure' },
      wrapCaptionBody: true,
    })
    const actual = parserForState.renderer.render(state.tokens, parserForState.options, {})
    assert.strictEqual(result, true)
    assert.strictEqual(
      actual,
      '<p class="caption-img"><span class="media-figure-label caption-img-label">Figure<span class="media-figure-label-joint caption-img-label-joint">.</span></span> <span class="media-figure-body caption-img-body">A cat.</span></p>\n',
    )
  } catch (err) {
    ok = false
    console.log('setCaptionParagraph test "figure class mirroring with partial opt" failed.')
  }

  try {
    const state = createStateForMarkdown('Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const sp = { figureClassName: 'figure-img' }
    const result = setCaptionParagraph(paragraphIndex, state, null, null, sp, {
      figureToLabelClassMap: { 'figure-img': 'media-figure' },
      labelClassFollowsFigure: false,
      wrapCaptionBody: true,
    })
    const actual = parserForState.renderer.render(state.tokens, parserForState.options, {})
    assert.strictEqual(result, true)
    assert.strictEqual(
      actual,
      '<p class="caption-img"><span class="caption-img-label">Figure<span class="caption-img-label-joint">.</span></span> <span class="caption-img-body">A cat.</span></p>\n',
    )
  } catch (err) {
    ok = false
    console.log('setCaptionParagraph test "explicit figure class mirroring opt-out" failed.')
  }

  try {
    const baseOpt = {
      classPrefix: 'f',
      markRegState: getMarkRegStateForLanguages(['en']),
      setFigureNumber: true,
      labelClassFollowsFigure: false,
    }
    const inheritedOpt = Object.create(baseOpt)
    const state = createStateForMarkdown('Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const fNum = { img: 0, table: 0 }
    const result = setCaptionParagraph(paragraphIndex, state, null, fNum, null, inheritedOpt)
    const actual = parserForState.renderer.render(state.tokens, parserForState.options, {})
    assert.strictEqual(result, true)
    assert.strictEqual(
      actual,
      '<p class="f-img"><span class="f-img-label">Figure 1<span class="f-img-label-joint">.</span></span> A cat.</p>\n',
    )
  } catch (err) {
    ok = false
    console.log('setCaptionParagraph test "inherited opt properties" failed.')
  }

  return ok
}

pass = runSetCaptionParagraphTests() && pass

const runCaptionParagraphPlannerTests = () => {
  let ok = true
  const assertPureDecision = (markdown, context, opt, expected) => {
    const state = createStateForMarkdown(markdown)
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const before = JSON.stringify(state.tokens)
    const decision = analyzeCaptionParagraph(paragraphIndex, state, context, opt)
    assert.strictEqual(JSON.stringify(state.tokens), before)
    assert.deepStrictEqual(decision, expected)
    return { state, decision }
  }

  try {
    const plannerOpt = Object.freeze({ languages: Object.freeze(['en']) })
    const context = Object.freeze({ captionName: 'img' })
    const { state, decision } = assertPureDecision(
      'Figure A.5. A cat.\n',
      context,
      plannerOpt,
      {
        paragraphIndex: 0,
        inlineIndex: 1,
        mark: 'img',
        kind: 'caption',
        matchedText: 'Figure A.5.',
        labelText: 'Figure',
        number: 'A.5',
        joint: '.',
        bodyText: 'A cat.',
        hasExplicitNumber: true,
        prefixMarker: '',
      },
    )
    assert.strictEqual(Object.isFrozen(decision), true)
    assert.strictEqual(applyCaptionParagraph({ ...decision }, state, {}, null, plannerOpt), false)
    const applyContext = {}
    assert.strictEqual(applyCaptionParagraph(decision, state, applyContext, null, plannerOpt), true)
    assert.deepStrictEqual(applyContext.captionDecision, decision)
    assert.strictEqual(
      parserForState.renderer.render(state.tokens, parserForState.options, {}),
      '<p class="caption-img"><span class="caption-img-label">Figure A.5<span class="caption-img-label-joint">.</span></span> A cat.</p>\n',
    )
    assert.strictEqual(applyCaptionParagraph(decision, state, applyContext, null, plannerOpt), false)
  } catch (err) {
    ok = false
    console.log('caption paragraph planner test "pure analyze/apply" failed.')
    console.log(err)
  }

  try {
    const state = createStateForMarkdown('Figure. **A cat.**\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const decision = analyzeCaptionParagraph(paragraphIndex, state)
    const inlineToken = state.tokens[decision.inlineIndex]
    inlineToken.children[2].content = 'Changed.'
    assert.strictEqual(applyCaptionParagraph(decision, state), false)
    assert.strictEqual(state.tokens[paragraphIndex].attrGet('class'), null)
  } catch (err) {
    ok = false
    console.log('caption paragraph planner test "stale child decision" failed.')
    console.log(err)
  }

  try {
    const state = createStateForMarkdown('▼ Figure 01. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const plannerOpt = Object.freeze({
      languages: Object.freeze(['en']),
      labelPrefixMarker: '▼',
    })
    const decision = analyzeCaptionParagraph(paragraphIndex, state, null, plannerOpt)
    assert.strictEqual(decision.number, '01')
    assert.strictEqual(decision.prefixMarker, '▼ ')
    assert.strictEqual(state.tokens[decision.inlineIndex].content, '▼ Figure 01. A cat.')
    assert.strictEqual(applyCaptionParagraph(decision, state, null, null, plannerOpt), true)
    assert.strictEqual(state.tokens[decision.inlineIndex].content, 'Figure 01. A cat.')
  } catch (err) {
    ok = false
    console.log('caption paragraph planner test "prefix marker" failed.')
    console.log(err)
  }

  try {
    const state = createStateForMarkdown('Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const decision = analyzeCaptionParagraph(paragraphIndex, state)
    state.tokens[decision.inlineIndex].content = 'Changed.'
    assert.strictEqual(applyCaptionParagraph(decision, state), false)
    assert.strictEqual(state.tokens[paragraphIndex].attrGet('class'), null)
  } catch (err) {
    ok = false
    console.log('caption paragraph planner test "stale decision" failed.')
    console.log(err)
  }

  try {
    const listState = createStateForMarkdown('- Figure. A cat.\n')
    const listParagraphIndex = listState.tokens.findIndex(token => token.type === 'paragraph_open')
    assert.strictEqual(analyzeCaptionParagraph(listParagraphIndex, listState), null)

    const videoState = createStateForMarkdown('Video. Clip.\n')
    const videoParagraphIndex = videoState.tokens.findIndex(token => token.type === 'paragraph_open')
    assert.strictEqual(
      analyzeCaptionParagraph(videoParagraphIndex, videoState, {
        captionName: 'iframe',
        isVideoIframe: true,
      }).mark,
      'video',
    )
    const mismatchState = createStateForMarkdown('Figure. A cat.\n')
    const mismatchParagraphIndex = mismatchState.tokens.findIndex(token => token.type === 'paragraph_open')
    assert.strictEqual(
      analyzeCaptionParagraph(mismatchParagraphIndex, mismatchState, {
        captionName: 'img',
        isVideoIframe: true,
      }),
      null,
    )
  } catch (err) {
    ok = false
    console.log('caption paragraph planner test "guards" failed.')
    console.log(err)
  }

  try {
    const state = createStateForMarkdown('Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const decision = analyzeCaptionParagraph(paragraphIndex, state)
    const context = {}
    assert.strictEqual(
      applyCaptionParagraph(decision, state, context, { img: 0, table: 0 }, { setFigureNumber: true }),
      true,
    )
    assert.strictEqual(context.captionDecision.number, '')
    assert.strictEqual(context.captionDecision.hasExplicitNumber, false)
    assert.match(state.tokens[decision.inlineIndex].content, /^Figure 1\./)
  } catch (err) {
    ok = false
    console.log('caption paragraph planner test "generated number decision" failed.')
    console.log(err)
  }

  try {
    const actual = mdit().use(mditPCaption, { setFigureNumber: true }).render(
      'Figure 1.2. First.\n\nFigure. Second.',
    )
    assert.strictEqual(
      actual,
      '<p class="caption-img"><span class="caption-img-label">Figure 1.2<span class="caption-img-label-joint">.</span></span> First.</p>\n' +
      '<p class="caption-img"><span class="caption-img-label">Figure 1<span class="caption-img-label-joint">.</span></span> Second.</p>\n',
    )
  } catch (err) {
    ok = false
    console.log('caption paragraph planner test "composite number counter" failed.')
    console.log(err)
  }

  return ok
}

pass = runCaptionParagraphPlannerTests() && pass

const runCaptionNumberingPolicyTests = () => {
  let ok = true
  const applyWithRuntime = (markdown, runtime, context = {}, opt = {}) => {
    const state = createStateForMarkdown(markdown)
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const result = setCaptionParagraph(paragraphIndex, state, null, runtime, context, opt)
    return {
      result,
      state,
      context,
      html: parserForState.renderer.render(state.tokens, parserForState.options, {}),
    }
  }

  try {
    const policy = createCaptionNumberingPolicy({
      enabledMarks: ['img', 'table'],
      explicitCounter: 'max',
    })
    assert.strictEqual(Object.isFrozen(policy), true)
    assert.throws(() => createCaptionNumberingPolicy([]), TypeError)
    assert.throws(() => createCaptionNumberingPolicy({ enabledMarks: 'img' }), TypeError)
    const genericPolicy = createCaptionNumberingPolicy({
      enabledMarks: ['video', 'pre-code', 'pre-samp', 'constructor', 'video'],
    })
    assert.strictEqual(genericPolicy.enabledMarks.video, true)
    assert.strictEqual(genericPolicy.enabledMarks['pre-code'], true)
    assert.strictEqual(genericPolicy.enabledMarks['pre-samp'], true)
    assert.strictEqual(genericPolicy.enabledMarks.constructor, true)
    assert.strictEqual(Object.getPrototypeOf(genericPolicy.enabledMarks), null)
    const manyGenericMarks = Array.from({ length: 100 }, (_, index) => `mark-${index}`)
    const longGenericMark = `mark-${'x'.repeat(512)}`
    const unrestrictedGenericPolicy = createCaptionNumberingPolicy({
      enabledMarks: [...manyGenericMarks, longGenericMark],
    })
    assert.strictEqual(unrestrictedGenericPolicy.enabledMarks['mark-99'], true)
    assert.strictEqual(unrestrictedGenericPolicy.enabledMarks[longGenericMark], true)
    for (const invalidMark of [null, '', ' code', 'code ', 'Pre-code', 'pre--code', '_private', '__proto__']) {
      assert.throws(() => createCaptionNumberingPolicy({ enabledMarks: [invalidMark] }), TypeError)
    }
    assert.throws(() => createCaptionNumberingPolicy({ explicitCounter: 'latest' }), TypeError)
    assert.throws(() => createCaptionNumberingPolicy({ getCounterKey: true }), TypeError)
    assert.throws(() => createCaptionNumberingPolicy({ getSequenceKey: true }), TypeError)
    assert.throws(() => createCaptionNumberingPolicy({ generatedNumberHasNumClass: 'yes' }), TypeError)
    assert.throws(() => createCaptionNumberingRuntime({ ...policy }), TypeError)
    assert.throws(() => createCaptionNumberingRuntime(policy, []), TypeError)
    const runtime = createCaptionNumberingRuntime(policy, { env: {} })
    assert.strictEqual(Object.isFrozen(runtime), true)
    assert.match(applyWithRuntime('Figure. First.\n', runtime).html, /Figure 1/)
    assert.match(applyWithRuntime('Figure 5. Manual.\n', runtime).html, /Figure 5/)
    assert.match(applyWithRuntime('Figure 2. Lower.\n', runtime).html, /Figure 2/)
    assert.match(applyWithRuntime('Figure. Next.\n', runtime).html, /Figure 6/)
    assert.match(applyWithRuntime('Table. First.\n', runtime).html, /Table 1/)

    const callerMarks = ['video']
    const copiedPolicy = createCaptionNumberingPolicy({ enabledMarks: callerMarks })
    callerMarks[0] = 'img'
    assert.strictEqual(copiedPolicy.enabledMarks.video, true)
    assert.strictEqual(copiedPolicy.enabledMarks.img, undefined)

    let disabledCounterKeyCalls = 0
    const imgOnlyPolicy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      getCounterKey() {
        disabledCounterKeyCalls++
        return 'figure'
      },
    })
    const imgOnlyRuntime = createCaptionNumberingRuntime(imgOnlyPolicy)
    assert.doesNotMatch(applyWithRuntime('Video. Disabled.\n', imgOnlyRuntime).html, /Video 1/)
    assert.strictEqual(disabledCounterKeyCalls, 0)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "built-in counters" failed.')
    console.log(err)
  }

  try {
    let counterKeyCalls = 0
    let sequenceKeyCalls = 0
    const policy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      explicitCounter: 'ignore',
      getCounterKey() {
        counterKeyCalls++
        return 'img'
      },
      getSequenceKey() {
        sequenceKeyCalls++
        return null
      },
      parseExplicitNumber() {
        throw new Error('ignored explicit numbers must not be parsed')
      },
    })
    const runtime = createCaptionNumberingRuntime(policy)
    assert.match(applyWithRuntime('Figure 5. Manual.\n', runtime).html, /Figure 5/)
    assert.strictEqual(counterKeyCalls, 0)
    assert.strictEqual(sequenceKeyCalls, 0)
    assert.match(applyWithRuntime('Figure. First automatic.\n', runtime).html, /Figure 1/)
    assert.strictEqual(counterKeyCalls, 1)
    assert.strictEqual(sequenceKeyCalls, 1)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "ignored explicit counters" failed.')
    console.log(err)
  }

  try {
    const calls = []
    const policy = createCaptionNumberingPolicy({
      enabledMarks: ['img', 'pre-samp'],
      getCounterKey(input) {
        calls.push(['counter', input.mark, 'counterKey' in input, 'sequenceKey' in input])
        return 'shared'
      },
      getSequenceKey(input) {
        calls.push(['sequence', input.counterKey, 'sequenceKey' in input])
        return null
      },
      parseExplicitNumber(input) {
        calls.push(['parse', input.counterKey, input.sequenceKey, input.number])
        return Number(input.number)
      },
      formatGeneratedNumber(input) {
        calls.push(['format', input.counterKey, input.sequenceKey, input.sequence])
        return String(input.sequence)
      },
    })
    const runtime = createCaptionNumberingRuntime(policy)
    assert.match(applyWithRuntime('Figure. First.\n', runtime).html, /Figure 1/)
    assert.match(applyWithRuntime('Terminal. Shared.\n', runtime).html, /Terminal 2/)
    assert.match(applyWithRuntime('Figure 5. Manual.\n', runtime).html, /Figure 5/)
    assert.match(applyWithRuntime('Terminal. Next.\n', runtime).html, /Terminal 6/)
    assert.deepStrictEqual(calls[0], ['counter', 'img', false, false])
    assert.deepStrictEqual(calls[1], ['sequence', 'shared', false])
    assert.deepStrictEqual(calls[2], ['format', 'shared', null, 1])
    assert.ok(calls.some(call => call[0] === 'parse' && call[1] === 'shared' && call[2] === null && call[3] === '5'))

    const typedPolicy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      getCounterKey({ captionContext }) {
        return captionContext.counterKey
      },
      getSequenceKey({ captionContext }) {
        return captionContext.sequenceKey
      },
    })
    const typedRuntime = createCaptionNumberingRuntime(typedPolicy)
    assert.match(applyWithRuntime('Figure. String one.\n', typedRuntime, { counterKey: '1', sequenceKey: null }).html, /Figure 1/)
    assert.match(applyWithRuntime('Figure. Number one.\n', typedRuntime, { counterKey: 1, sequenceKey: null }).html, /Figure 1/)
    assert.match(applyWithRuntime('Figure. String two.\n', typedRuntime, { counterKey: '1', sequenceKey: null }).html, /Figure 2/)
    assert.match(applyWithRuntime('Figure. Scoped A.\n', typedRuntime, { counterKey: 'shared', sequenceKey: 'A' }).html, /Figure 1/)
    assert.match(applyWithRuntime('Figure. Scoped B.\n', typedRuntime, { counterKey: 'shared', sequenceKey: 'B' }).html, /Figure 1/)
    assert.match(applyWithRuntime('Figure. Scoped A2.\n', typedRuntime, { counterKey: 'shared', sequenceKey: 'A' }).html, /Figure 2/)
    assert.match(applyWithRuntime('Figure. Proto.\n', typedRuntime, { counterKey: '__proto__', sequenceKey: null }).html, /Figure 1/)
    assert.match(applyWithRuntime('Figure. Constructor.\n', typedRuntime, { counterKey: 'constructor', sequenceKey: null }).html, /Figure 1/)

    const sequenceOnlyInputs = []
    const sequenceOnlyPolicy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      getSequenceKey(input) {
        sequenceOnlyInputs.push(input)
        return 'chapter:1'
      },
    })
    const sequenceOnlyRuntime = createCaptionNumberingRuntime(sequenceOnlyPolicy)
    assert.match(applyWithRuntime('Figure. Sequence one.\n', sequenceOnlyRuntime).html, /Figure 1/)
    assert.match(applyWithRuntime('Figure. Sequence two.\n', sequenceOnlyRuntime).html, /Figure 2/)
    assert.strictEqual(sequenceOnlyInputs.length, 2)
    assert.strictEqual(sequenceOnlyInputs[0].counterKey, 'img')
    assert.strictEqual('sequenceKey' in sequenceOnlyInputs[0], false)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "counter key grouping and storage" failed.')
    console.log(err)
  }

  try {
    const policy = createCaptionNumberingPolicy({
      enabledMarks: ['img', 'table'],
      explicitCounter: 'max',
      getSequenceKey({ captionContext }) {
        return captionContext.numbering.sequenceKey
      },
      parseExplicitNumber({ number, captionContext }) {
        const numbering = captionContext.numbering
        if (!numbering.scoped) return /^[1-9][0-9]*$/.test(number) ? Number(number) : null
        const prefix = numbering.displayPrefix + numbering.separator
        if (!number.startsWith(prefix)) return null
        const tail = number.slice(prefix.length)
        return /^[1-9][0-9]*$/.test(tail) ? Number(tail) : null
      },
      formatGeneratedNumber({ sequence, captionContext }) {
        const numbering = captionContext.numbering
        return numbering.scoped
          ? numbering.displayPrefix + numbering.separator + sequence
          : String(sequence)
      },
    })
    const runtime = createCaptionNumberingRuntime(policy)
    const contextA = { numbering: { scoped: true, sequenceKey: 'appendix:A', displayPrefix: 'A', separator: '.' } }
    const contextB = { numbering: { scoped: true, sequenceKey: 2, displayPrefix: 'B', separator: '-' } }
    const unscoped = { numbering: { scoped: false, sequenceKey: null, displayPrefix: '', separator: '' } }
    assert.match(applyWithRuntime('Figure. A1.\n', runtime, contextA).html, /Figure A\.1/)
    assert.match(applyWithRuntime('Figure A.5. A5.\n', runtime, contextA).html, /Figure A\.5/)
    assert.match(applyWithRuntime('Figure. A6.\n', runtime, contextA).html, /Figure A\.6/)
    assert.match(applyWithRuntime('Figure. B1.\n', runtime, contextB).html, /Figure B-1/)
    assert.match(applyWithRuntime('Figure. U1.\n', runtime, unscoped).html, /Figure 1/)
    assert.match(applyWithRuntime('Table. TA1.\n', runtime, contextA).html, /Table A\.1/)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "keyed compound counters" failed.')
    console.log(err)
  }

  try {
    let failFormatter = true
    const policy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      getSequenceKey: () => null,
      formatGeneratedNumber({ sequence }) {
        if (failFormatter) throw new Error('formatter failure')
        return String(sequence)
      },
    })
    const runtime = createCaptionNumberingRuntime(policy)
    const state = createStateForMarkdown('▼ Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const before = JSON.stringify(state.tokens)
    assert.throws(
      () => setCaptionParagraph(paragraphIndex, state, null, runtime, {}, { labelPrefixMarker: '▼' }),
      /formatter failure/,
    )
    assert.strictEqual(JSON.stringify(state.tokens), before)
    failFormatter = false
    assert.match(applyWithRuntime('Figure. Next.\n', runtime).html, /Figure 1/)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "callback transaction" failed.')
    console.log(err)
  }

  try {
    let failCounterKey = true
    const policy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      getCounterKey() {
        if (failCounterKey) throw new Error('counter key failure')
        return 'figure'
      },
    })
    const runtime = createCaptionNumberingRuntime(policy)
    const state = createStateForMarkdown('▼ Figure. A cat.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const before = JSON.stringify(state.tokens)
    assert.throws(
      () => setCaptionParagraph(paragraphIndex, state, null, runtime, {}, { labelPrefixMarker: '▼' }),
      /counter key failure/,
    )
    assert.strictEqual(JSON.stringify(state.tokens), before)
    failCounterKey = false
    assert.match(applyWithRuntime('Figure. Next.\n', runtime).html, /Figure 1/)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "counter key transaction" failed.')
    console.log(err)
  }

  try {
    const invalidCounterKeyValues = [
      null,
      undefined,
      '',
      {},
      Symbol('x'),
      1n,
      Promise.resolve('x'),
      { then() {} },
      Infinity,
      'x'.repeat(257),
    ]
    for (const invalidValue of invalidCounterKeyValues) {
      const policy = createCaptionNumberingPolicy({
        enabledMarks: ['img'],
        getCounterKey: () => invalidValue,
      })
      const runtime = createCaptionNumberingRuntime(policy)
      assert.throws(() => applyWithRuntime('Figure. Invalid.\n', runtime), Error)
    }

    const invalidKeyValues = [undefined, {}, Promise.resolve('x'), { then() {} }, Infinity, 'x'.repeat(257)]
    for (const invalidValue of invalidKeyValues) {
      const policy = createCaptionNumberingPolicy({
        enabledMarks: ['img'],
        getSequenceKey: () => invalidValue,
      })
      const runtime = createCaptionNumberingRuntime(policy)
      assert.throws(() => applyWithRuntime('Figure. Invalid.\n', runtime), Error)
    }

    const invalidParserValues = [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', {}, Promise.resolve(1), { then() {} }]
    for (const invalidValue of invalidParserValues) {
      const policy = createCaptionNumberingPolicy({
        enabledMarks: ['img'],
        parseExplicitNumber: () => invalidValue,
      })
      const runtime = createCaptionNumberingRuntime(policy)
      assert.throws(() => applyWithRuntime('Figure 1. Invalid.\n', runtime), TypeError)
    }

    const invalidFormatterValues = ['', 1, {}, Promise.resolve('1'), { then() {} }, '1000000']
    for (const invalidValue of invalidFormatterValues) {
      const policy = createCaptionNumberingPolicy({
        enabledMarks: ['img'],
        formatGeneratedNumber: () => invalidValue,
      })
      const runtime = createCaptionNumberingRuntime(policy)
      assert.throws(() => applyWithRuntime('Figure. Invalid.\n', runtime), Error)
    }
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "invalid callback results" failed.')
    console.log(err)
  }

  try {
    const policy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      explicitCounter: 'replace',
      parseExplicitNumber({ number }) {
        return number === '999999' ? 999999 : null
      },
      formatGeneratedNumber({ sequence }) {
        return String(sequence)
      },
    })
    const runtime = createCaptionNumberingRuntime(policy)
    applyWithRuntime('Figure 999999. Limit.\n', runtime)
    const overflowState = createStateForMarkdown('Figure. Overflow.\n')
    const paragraphIndex = overflowState.tokens.findIndex(token => token.type === 'paragraph_open')
    const before = JSON.stringify(overflowState.tokens)
    assert.throws(
      () => setCaptionParagraph(paragraphIndex, overflowState, null, runtime, {}, {}),
      RangeError,
    )
    assert.strictEqual(JSON.stringify(overflowState.tokens), before)
    assert.strictEqual(
      mdit().use(mditPCaption, { setFigureNumber: true }).render('Figure 999999. Limit.\n\nFigure. Overflow.'),
      '<p class="caption-img"><span class="caption-img-label">Figure 999999<span class="caption-img-label-joint">.</span></span> Limit.</p>\n' +
      '<p class="caption-img"><span class="caption-img-label">Figure 1000000<span class="caption-img-label-joint">.</span></span> Overflow.</p>\n',
    )

    const defaultPolicy = createCaptionNumberingPolicy({
      enabledMarks: ['img'],
      explicitCounter: 'replace',
    })
    const defaultRuntime = createCaptionNumberingRuntime(defaultPolicy)
    applyWithRuntime('Figure 999999. Limit.\n', defaultRuntime)
    const defaultOverflowState = createStateForMarkdown('Figure. Overflow.\n')
    const defaultOverflowIndex = defaultOverflowState.tokens.findIndex(token => token.type === 'paragraph_open')
    const defaultOverflowBefore = JSON.stringify(defaultOverflowState.tokens)
    assert.throws(
      () => setCaptionParagraph(defaultOverflowIndex, defaultOverflowState, null, defaultRuntime, {}, {}),
      RangeError,
    )
    assert.strictEqual(JSON.stringify(defaultOverflowState.tokens), defaultOverflowBefore)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "strict and legacy overflow" failed.')
    console.log(err)
  }

  try {
    const policy = createCaptionNumberingPolicy({ enabledMarks: ['img'] })
    const runtime = createCaptionNumberingRuntime(policy)
    const state = createStateForMarkdown('Figure. Deferred.\n')
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    const decision = analyzeCaptionParagraph(paragraphIndex, state)
    state.tokens[decision.inlineIndex].content = 'Changed.'
    assert.strictEqual(applyCaptionParagraph(decision, state, {}, runtime), false)
    const context = {}
    assert.match(applyWithRuntime('Figure. Fresh.\n', runtime, context).html, /Figure 1/)
    assert.strictEqual(context.captionDecision.number, '')
    assert.strictEqual(context.captionDecision.hasExplicitNumber, false)
  } catch (err) {
    ok = false
    console.log('caption numbering policy test "stale apply and source decision" failed.')
    console.log(err)
  }

  return ok
}

pass = runCaptionNumberingPolicyTests() && pass

const runStandaloneCaptionNumberingOptionTests = () => {
  let ok = true
  try {
    assert.deepStrictEqual(normalizeAutoLabelNumberSets(['code', 'pre-code', 'samp', 'pre-samp', 'video']), [
      'pre-code',
      'pre-samp',
      'video',
    ])
    assert.strictEqual(canonicalizeCaptionNumberingMark('code'), 'pre-code')
    assert.strictEqual(canonicalizeCaptionNumberingMark('samp'), 'pre-samp')
    assert.strictEqual(canonicalizeCaptionNumberingMark('unknown'), 'unknown')
    assert.strictEqual(canonicalizeCaptionNumberingMark(null), null)
    for (const invalidValue of [undefined, null, 'code', {}, 1]) {
      assert.throws(() => normalizeAutoLabelNumberSets(invalidValue), TypeError)
    }
    for (const invalidEntry of [null, '', ' ', ' code', 'code ', 'unknown', 'constructor']) {
      assert.throws(() => normalizeAutoLabelNumberSets([invalidEntry]), TypeError)
    }

    const codeMd = mdit().use(mditPCaption, { autoLabelNumberSets: ['code'] })
    const codeHtml = codeMd.render('Code. First.\n\nCode. Second.\n\nFigure. Figure.\n\nVideo. Video.')
    assert.match(codeHtml, /Code 1/)
    assert.match(codeHtml, /Code 2/)
    assert.doesNotMatch(codeHtml, /Figure 1/)
    assert.doesNotMatch(codeHtml, /Video 1/)
    assert.match(codeMd.render('Code. Reset.\n'), /Code 1/)

    const sampHtml = mdit().use(mditPCaption, { autoLabelNumberSets: ['samp'] }).render(
      'Terminal. First.\n\n端末　2番目。\n\n図　画像扱い。',
    )
    assert.match(sampHtml, /Terminal 1/)
    assert.match(sampHtml, /端末2/)
    assert.doesNotMatch(sampHtml, /図1/)

    const videoHtml = mdit().use(mditPCaption, { autoLabelNumberSets: ['video'] }).render(
      'Video. First.\n\n動画　2番目。',
    )
    assert.match(videoHtml, /Video 1/)
    assert.match(videoHtml, /動画2/)

    const precedenceHtml = mdit().use(mditPCaption, {
      setFigureNumber: true,
      autoLabelNumberSets: ['code'],
    }).render('Figure. Not numbered.\n\nCode. Numbered.')
    assert.doesNotMatch(precedenceHtml, /Figure 1/)
    assert.match(precedenceHtml, /Code 1/)
    const disabledHtml = mdit().use(mditPCaption, {
      setFigureNumber: true,
      autoLabelNumberSets: [],
    }).render('Figure. Not numbered.\n\nTable. Not numbered.')
    assert.doesNotMatch(disabledHtml, /Figure 1/)
    assert.doesNotMatch(disabledHtml, /Table 1/)

    const removedHtml = mdit().use(mditPCaption, {
      autoLabelNumberSets: ['code'],
      removeUnnumberedLabel: true,
    }).render('Code. Removed label.')
    assert.doesNotMatch(removedHtml, />Code/)
    const exceptHtml = mdit().use(mditPCaption, {
      autoLabelNumberSets: ['code'],
      removeUnnumberedLabel: true,
      removeUnnumberedLabelExceptMarks: ['code'],
    }).render('Code. Kept and numbered.')
    assert.match(exceptHtml, /Code 1/)
    const legacyRemoveHtml = mdit().use(mditPCaption, {
      setFigureNumber: true,
      removeUnnumberedLabel: true,
    }).render('Figure. Legacy remains numbered.')
    assert.match(legacyRemoveHtml, /Figure 1/)

    const formattedHtml = mdit().use(mditPCaption, {
      autoLabelNumberSets: ['video'],
      hasNumClass: true,
      strongLabel: true,
      wrapCaptionBody: true,
    }).render('Video. Formatted.')
    assert.match(formattedHtml, /<strong class="caption-video-label label-has-num">Video 1/)
    assert.match(formattedHtml, /<span class="caption-video-body">Formatted\.<\/span>/)

    const directState = createStateForMarkdown('Code. Direct helper.\n')
    const directIndex = directState.tokens.findIndex(token => token.type === 'paragraph_open')
    assert.strictEqual(
      setCaptionParagraph(directIndex, directState, null, null, {}, { autoLabelNumberSets: ['code'] }),
      true,
    )
    assert.doesNotMatch(directState.tokens[directIndex + 1].content, /Code 1/)

    const callerMarks = ['code']
    const copiedMd = mdit().use(mditPCaption, { autoLabelNumberSets: callerMarks })
    callerMarks[0] = 'video'
    assert.match(copiedMd.render('Code. Copied.\n\nVideo. Unchanged.'), /Code 1/)

    for (const invalidOptions of [
      { autoLabelNumberSets: undefined },
      { autoLabelNumberSets: null },
      { autoLabelNumberSets: 'code' },
      { autoLabelNumberSets: ['unknown'] },
      { autoLabelNumberSets: [null] },
      { autoLabelNumberSets: [''] },
    ]) {
      assert.throws(() => mdit().use(mditPCaption, invalidOptions), TypeError)
    }

    const retryMd = mdit()
    assert.throws(() => retryMd.use(mditPCaption, { autoLabelNumberSets: null }), TypeError)
    assert.doesNotThrow(() => retryMd.use(mditPCaption, { autoLabelNumberSets: ['code'] }))
    assert.match(retryMd.render('Code. Retry.'), /Code 1/)
    assert.doesNotThrow(() => retryMd.use(mditPCaption, { autoLabelNumberSets: null }))
    assert.match(retryMd.render('Code. Still first install.'), /Code 1/)
  } catch (err) {
    ok = false
    console.log('standalone caption numbering option tests failed.')
    console.log(err)
  }
  return ok
}

pass = runStandaloneCaptionNumberingOptionTests() && pass

const runCaptionBoundaryTests = () => {
  let ok = true
  try {
    assert.strictEqual(isCaptionLabelBoundary('Chapter 1', 9, { layout: 'spaced', hasNumber: true }), true)
    assert.strictEqual(isCaptionLabelBoundary('Chapter 1st', 9, { layout: 'spaced', hasNumber: true }), false)
    assert.strictEqual(isCaptionLabelBoundary('Chapter 1: Introduction', 9, { layout: 'spaced', hasNumber: true }), true)
    assert.strictEqual(isCaptionLabelBoundary('Chapter 1 Introduction', 9, { layout: 'spaced', hasNumber: true }), true)
    assert.strictEqual(isCaptionLabelBoundary('Chapter 1 introduction', 9, { layout: 'spaced', hasNumber: true }), false)
    assert.strictEqual(isCaptionLabelBoundary('第1章', 3, { layout: 'compact', hasNumber: true }), true)
    assert.strictEqual(isCaptionLabelBoundary('第1章立て', 3, { layout: 'compact', hasNumber: true }), false)
    assert.strictEqual(isCaptionLabelBoundary('第1章　はじめに', 3, { layout: 'compact', hasNumber: true }), true)
    assert.strictEqual(isCaptionLabelBoundary('Figure.', 6, { layout: 'spaced', hasNumber: false }), true)
    assert.strictEqual(isCaptionLabelBoundary('Figure', 6, { layout: 'spaced', hasNumber: false }), false)
    assert.strictEqual(isCaptionLabelBoundary('図　', 1, { layout: 'compact', hasNumber: false }), true)
    assert.throws(() => isCaptionLabelBoundary('x', 0, { layout: 'unknown' }), TypeError)

    const state = getMarkRegStateForLanguages(['en', 'ja'])
    const spacedTails = ['.', ': ', '　', ' X', ' x', 'st', '']
    for (const tail of spacedTails) {
      const source = 'Figure 1' + tail
      assert.strictEqual(
        !!analyzeCaptionStart(source, { markRegState: state, preferredMark: 'img' }),
        isCaptionLabelBoundary(source, 8, { layout: 'spaced', hasNumber: true }),
      )
    }
    const compactTails = ['。', '：', '　', ' 本文', '続き', '']
    for (const tail of compactTails) {
      const source = '図1' + tail
      assert.strictEqual(
        !!analyzeCaptionStart(source, { markRegState: state, preferredMark: 'img' }),
        isCaptionLabelBoundary(source, 2, { layout: 'compact', hasNumber: true }),
      )
    }
  } catch (err) {
    ok = false
    console.log('caption boundary helper tests failed.')
    console.log(err)
  }
  return ok
}

pass = runCaptionBoundaryTests() && pass

const runHelperExportTests = () => {
  let ok = true

  try {
    const stateA = getMarkRegStateForLanguages(['ja', 'en'])
    const stateB = getMarkRegStateForLanguages(['en', 'ja'])
    const enMarkReg = getMarkRegForLanguages(['en'])
    assert.deepStrictEqual(stateA.languages, ['ja', 'en'])
    assert.deepStrictEqual(stateB.languages, ['en', 'ja'])
    assert.notStrictEqual(stateA, stateB)
    assert.ok(enMarkReg.img.test('Figure. A cat.'))
    assert.ok(enMarkReg.img.test('figure. A cat.'))
    assert.strictEqual(stateA.generatedLabelDefaultsByLang.en.img.label, 'Figure')
    assert.strictEqual(stateA.generatedLabelDefaultsByLang.ja.img.label, '図')
    assert.deepStrictEqual(getGeneratedLabelDefaults('img', 'A cat.', stateA), {
      label: '図',
      joint: '　',
      space: '',
    })
    assert.deepStrictEqual(getGeneratedLabelDefaults('img', '猫です。', stateA), {
      label: '図',
      joint: '　',
      space: '',
    })
    assert.deepStrictEqual(getGeneratedLabelDefaults('img', 'A cat.', stateA, ['ja', 'en']), {
      label: '図',
      joint: '　',
      space: '',
    })
    assert.deepStrictEqual(getGeneratedLabelDefaults('img', 'A cat.', stateA, ['de']), {
      label: '図',
      joint: '　',
      space: '',
    })
    assert.deepStrictEqual(getGeneratedLabelDefaults('img', '猫です。', stateA, ['en', 'ja']), {
      label: '図',
      joint: '　',
      space: '',
    })
    assert.strictEqual(getFallbackLabelForText('img', 'A cat.', stateA), '図')
    assert.strictEqual(getFallbackLabelForText('img', '猫です。', stateA), '図')
    assert.strictEqual(getFallbackLabelForText('img', 'A cat.', stateA, ['ja', 'en']), '図')
    assert.strictEqual(getFallbackLabelForText('img', 'A cat.', stateA, ['de']), '図')
    assert.strictEqual(getFallbackLabelForText('img', '猫です。', stateA, ['en', 'ja']), '図')
    assert.strictEqual(getFallbackLabelForText('img', 'A cat.', stateB), 'Figure')
    assert.strictEqual(getFallbackLabelForText('table', '表です。', stateA), '表')
    assert.strictEqual(getFallbackLabelForText('img', 'A cat.', getMarkRegStateForLanguages(['ja'])), '図')
    assert.strictEqual(getFallbackLabelForText('img', '猫です。', getMarkRegStateForLanguages(['en'])), 'Figure')
    assert.strictEqual(getFallbackLabelForText('img', 123, stateA), '図')

    const unsupportedState = getMarkRegStateForLanguages(['fr', 'de'])
    assert.deepStrictEqual(unsupportedState.languages, [])
    assert.strictEqual(Object.keys(unsupportedState.markReg).length, 0)
    assert.strictEqual(getFallbackLabelForText('img', 'A cat.', unsupportedState), '')
  } catch (err) {
    ok = false
    console.log('helper export test "generated label defaults" failed.')
    console.log(err)
  }

  try {
    const state = getMarkRegStateForLanguages(['en', 'ja'])
    assert.strictEqual(isCaptionLabelForMark('図', 'img', state), true)
    assert.strictEqual(isCaptionLabelForMark('図', 'pre-samp', state), true)
    assert.strictEqual(isCaptionLabelForMark('リスト', 'pre-code', state), true)
    assert.strictEqual(isCaptionLabelForMark('リスト', 'pre-samp', state), true)
    assert.strictEqual(isCaptionLabelForMark('端末', 'pre-samp', state), true)
    assert.strictEqual(isCaptionLabelForMark('端末', 'img', state), false)
    assert.strictEqual(isCaptionLabelForMark('Figure', 'img', state), true)
    assert.strictEqual(isCaptionLabelForMark('figure', 'img', state), true)
    assert.strictEqual(isCaptionLabelForMark('Video', 'video', state), true)
    assert.strictEqual(isCaptionLabelForMark('動画', 'video', state), true)
    for (const text of [' Figure', 'Figure ', 'Figure.', 'Figur', 'Figure extra', '']) {
      assert.strictEqual(isCaptionLabelForMark(text, 'img', state), false)
    }
    assert.strictEqual(isCaptionLabelForMark('図', 'img', getMarkRegStateForLanguages(['en'])), false)
    assert.strictEqual(isCaptionLabelForMark('Figure', 'img', getMarkRegStateForLanguages(['ja'])), false)
    assert.strictEqual(isCaptionLabelForMark('Figure', 'missing', state), false)
    assert.strictEqual(isCaptionLabelForMark('Figure', 'img', { ...state }), false)
    assert.strictEqual(isCaptionLabelForMark(null, 'img', state), false)
    assert.strictEqual(isCaptionLabelForMark('Figure', null, state), false)
  } catch (err) {
    ok = false
    console.log('helper export test "exact caption labels" failed.')
    console.log(err)
  }

  try {
    const markers = normalizeLabelPrefixMarkers(['▼', '▲', '◇'])
    assert.deepStrictEqual(markers, ['▼', '▲'])
    assert.deepStrictEqual(normalizeLabelPrefixMarkers([null, undefined, '', '▼']), ['▼'])
    const markerReg = buildLabelPrefixMarkerRegFromMarkers(markers)
    assert.ok(markerReg)
    assert.ok(markerReg.test('▼ Figure. A cat.'))
    assert.ok(markerReg.test('▲Figure. A cat.'))
    const prefixMarkers = normalizeLabelPrefixMarkers(['*', '**'])
    const prefixMarkerReg = buildLabelPrefixMarkerRegFromMarkers(prefixMarkers)
    assert.strictEqual(prefixMarkerReg.exec('** Figure. A cat.')[0], '** ')
    assert.strictEqual(buildLabelPrefixMarkerRegFromMarkers(null), null)
    assert.strictEqual(buildLabelPrefixMarkerRegFromMarkers([null, undefined, '']), null)

    const inlineToken = createStateForMarkdown('▼Figure. A cat.\n').tokens.find(token => token.type === 'inline')
    stripLabelPrefixMarker(inlineToken, '▼')
    assert.strictEqual(inlineToken.content, 'Figure. A cat.')
    assert.strictEqual(inlineToken.children[0].content, 'Figure. A cat.')
  } catch (err) {
    ok = false
    console.log('helper export test "label prefix marker helpers" failed.')
    console.log(err)
  }

  try {
    assert.deepStrictEqual(
      buildLabelClassLookup({ classPrefix: 'caption', removeMarkNameInCaptionClass: false }),
      {
        img: ['caption-img-label', 'caption-label'],
        table: ['caption-table-label', 'caption-label'],
        default: ['caption-label'],
      },
    )
    assert.deepStrictEqual(
      buildLabelClassLookup({ classPrefix: 'caption', removeMarkNameInCaptionClass: true }),
      {
        img: ['caption-label'],
        table: ['caption-label'],
        default: ['caption-label'],
      },
    )
    assert.deepStrictEqual(
      buildLabelClassLookup({ classPrefix: '', removeMarkNameInCaptionClass: false }),
      {
        img: ['img-label', 'label'],
        table: ['table-label', 'label'],
        default: ['label'],
      },
    )
    assert.deepStrictEqual(
      buildLabelClassLookup(Object.create({ classPrefix: 'f', removeMarkNameInCaptionClass: false })),
      {
        img: ['f-img-label', 'f-label'],
        table: ['f-table-label', 'f-label'],
        default: ['f-label'],
      },
    )
  } catch (err) {
    ok = false
    console.log('helper export test "buildLabelClassLookup" failed.')
    console.log(err)
  }

  try {
    const state = getMarkRegStateForLanguages(['en', 'ja'])
    assert.deepStrictEqual(
      analyzeCaptionStart('Figure 1. A cat.', { markRegState: state, preferredMark: 'img' }),
      {
        mark: 'img',
        kind: 'caption',
        matchedText: 'Figure 1.',
        labelText: 'Figure',
        number: '1',
        joint: '.',
        bodyText: 'A cat.',
        hasExplicitNumber: true,
        prefixMarker: '',
      },
    )
    assert.deepStrictEqual(
      analyzeCaptionStart('図1　キャプション', { markRegState: state, preferredMark: 'img' }),
      {
        mark: 'img',
        kind: 'caption',
        matchedText: '図1　',
        labelText: '図',
        number: '1',
        joint: '　',
        bodyText: 'キャプション',
        hasExplicitNumber: true,
        prefixMarker: '',
      },
    )
    assert.deepStrictEqual(
      analyzeCaptionStart('Figure 1', { markRegState: state, preferredMark: 'img' }),
      {
        mark: 'img',
        kind: 'label-only',
        matchedText: 'Figure 1',
        labelText: 'Figure',
        number: '1',
        joint: '',
        bodyText: '',
        hasExplicitNumber: true,
        prefixMarker: '',
      },
    )
    assert.deepStrictEqual(
      analyzeCaptionStart('▼ Figure. Marker', {
        markRegState: state,
        preferredMark: 'img',
        labelPrefixMarker: '▼',
      }),
      {
        mark: 'img',
        kind: 'caption',
        matchedText: 'Figure.',
        labelText: 'Figure',
        number: '',
        joint: '.',
        bodyText: 'Marker',
        hasExplicitNumber: false,
        prefixMarker: '▼ ',
      },
    )
    assert.strictEqual(analyzeCaptionStart('Plain text', { markRegState: state, preferredMark: 'img' }), null)
    assert.deepStrictEqual(
      analyzeCaptionStart('図　', { markRegState: state, preferredMark: 'img' }),
      {
        mark: 'img',
        kind: 'label-only',
        matchedText: '図　',
        labelText: '図',
        number: '',
        joint: '　',
        bodyText: '',
        hasExplicitNumber: false,
        prefixMarker: '',
      },
    )
  } catch (err) {
    ok = false
    console.log('helper export test "analyzeCaptionStart" failed.')
    console.log(err)
  }

  return ok
}

pass = runHelperExportTests() && pass

if (pass) {
  console.log('Passed all test.')
} else {
  process.exitCode = 1
}
