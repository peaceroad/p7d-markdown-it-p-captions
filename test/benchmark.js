import { performance } from 'node:perf_hooks'

import mdit from 'markdown-it'

import mditPCaption from '../index.js'

const parseCounts = () => {
  const values = process.argv.slice(2)
    .map(value => Number.parseInt(value, 10))
    .filter(value => Number.isInteger(value) && value > 0)
  return values.length ? values : [100, 1000, 5000]
}

const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const percentile95 = (values) => {
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
}

const buildCaptionSource = (count, labels) => Array.from(
  { length: count },
  (_, index) => `${labels[index % labels.length]}. Caption ${index + 1}.`,
).join('\n\n')

const scenarios = [
  {
    name: 'explicit-figure-baseline',
    options: { wrapCaptionBody: true },
    buildSource: count => Array.from(
      { length: count },
      (_, index) => `Figure ${index + 1}. Caption ${index + 1}.`,
    ).join('\n\n'),
  },
  {
    name: 'numbering-disabled-mixed',
    options: {},
    buildSource: count => buildCaptionSource(count, ['Figure', 'Code', 'Terminal', 'Video', 'Table']),
  },
  {
    name: 'numbered-code',
    options: { autoLabelNumberSets: ['code'] },
    buildSource: count => buildCaptionSource(count, ['Code']),
  },
  {
    name: 'numbered-samp',
    options: { autoLabelNumberSets: ['samp'] },
    buildSource: count => buildCaptionSource(count, ['Terminal']),
  },
  {
    name: 'numbered-mixed',
    options: { autoLabelNumberSets: ['img', 'table', 'code', 'samp', 'video'] },
    buildSource: count => buildCaptionSource(count, ['Figure', 'Code', 'Terminal', 'Video', 'Table']),
  },
]

for (const count of parseCounts()) {
  for (const scenario of scenarios) {
    const source = scenario.buildSource(count)
    const md = mdit().use(mditPCaption, scenario.options)

    for (let index = 0; index < 3; index++) md.render(source)

    const samples = []
    for (let index = 0; index < 9; index++) {
      const start = performance.now()
      md.render(source)
      samples.push(performance.now() - start)
    }

    console.log(JSON.stringify({
      scenario: scenario.name,
      captions: count,
      medianMs: Number(median(samples).toFixed(3)),
      p95Ms: Number(percentile95(samples).toFixed(3)),
      minMs: Number(Math.min(...samples).toFixed(3)),
      maxMs: Number(Math.max(...samples).toFixed(3)),
    }))
  }
}
