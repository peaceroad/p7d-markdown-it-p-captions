import assert from 'assert'
import fs from 'fs'
import path from 'path'
import mdit from 'markdown-it'
import Token from 'markdown-it/lib/token.mjs'
import { fileURLToPath } from 'url'

import mditPCaption, { setCaptionParagraph } from '../index.js'

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
  setCaptionParagraph(paragraphIndex, state, caption, fNum, sp, opt)
  return { state, paragraphIndex }
}

// Run targeted tests that exercise the caption/sp guards and exported behavior.
const runSetCaptionParagraphTests = () => {
  let ok = true
  const runCase = (name, markdown, captionArg, spArg, expectedClass) => {
    const caption = captionArg ? { ...captionArg } : captionArg
    const sp = spArg ? { ...spArg } : spArg
    const { state, paragraphIndex } = applySetCaption(markdown, caption, sp)
    const actualClass = state.tokens[paragraphIndex].attrGet('class') || null
    try {
      assert.strictEqual(actualClass, expectedClass)
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
  return ok
}

pass = runSetCaptionParagraphTests() && pass

if (pass) console.log('Passed all test.')
