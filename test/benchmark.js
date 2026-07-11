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

for (const count of parseCounts()) {
  const source = Array.from(
    { length: count },
    (_, index) => `Figure ${index + 1}. Caption ${index + 1}.\n`,
  ).join('\n')
  const md = mdit().use(mditPCaption, { wrapCaptionBody: true })

  for (let index = 0; index < 3; index++) md.render(source)

  const samples = []
  for (let index = 0; index < 9; index++) {
    const start = performance.now()
    md.render(source)
    samples.push(performance.now() - start)
  }

  console.log(JSON.stringify({
    captions: count,
    medianMs: Number(median(samples).toFixed(3)),
    minMs: Number(Math.min(...samples).toFixed(3)),
    maxMs: Number(Math.max(...samples).toFixed(3)),
  }))
}
