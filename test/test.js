import assert from 'assert'
import fs from 'fs'
import path from 'path'
import mdit from 'markdown-it'
import { fileURLToPath } from 'url'

import mditPCaption from '../index.js'

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
].map((suite) => ({
  ...suite,
  md: createMd(suite.options),
}))

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

if (pass) console.log('Passed all test.')
