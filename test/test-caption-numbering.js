import assert from 'assert'
import mdit from 'markdown-it'
import Token from 'markdown-it/lib/token.mjs'

import mditPCaption, {
  analyzeCaptionParagraph,
  applyCaptionParagraph,
  canonicalizeCaptionNumberingMark,
  createCaptionNumberingPolicy,
  createCaptionNumberingRuntime,
  normalizeAutoLabelNumberSets,
  setCaptionParagraph,
} from '../index.js'

const parserForState = mdit()
const createStateForMarkdown = (markdown) => ({
  tokens: parserForState.parse(markdown, {}),
  Token,
})

console.log('=== Caption numbering tests ===')

let pass = true

const runCaptionNumberingPolicyTests = () => {
  let ok = true
  const applyWithRuntime = (markdown, runtime, context = {}, opt = {}) => {
    const state = createStateForMarkdown(markdown)
    const paragraphIndex = state.tokens.findIndex(token => token.type === 'paragraph_open')
    setCaptionParagraph(paragraphIndex, state, null, runtime, context, opt)
    return {
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

console.log('Test: policy and render-local runtime')
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

console.log('Test: standalone numbering options')
pass = runStandaloneCaptionNumberingOptionTests() && pass

if (pass) {
  console.log('Passed caption numbering tests.')
} else {
  process.exitCode = 1
}
