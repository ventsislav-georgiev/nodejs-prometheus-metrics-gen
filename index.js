const http = require('http')
const client = require('prom-client')

const register = new client.Registry()
client.register.clear()

const metricType = (client[process.env.VAR_TYPE] && process.env.VAR_TYPE) || 'Counter';
const metricsCount = parseInt(process.env.VAR_METRICS) || 1
const labelsCount = parseInt(process.env.VAR_LABELS) || 2
const firstLabelValues = parseInt(process.env.VAR_FIRST_LABEL_VALUES) || 5
const otherLabelValues = parseInt(process.env.VAR_OTHER_LABEL_VALUES) || 2
const eventsCount = parseInt(process.env.VAR_EVENTS) || 1
const interval = (parseFloat(process.env.VAR_INTERVAL_SECONDS) || 1) * 1000
const metricNamePrefix = process.env.VAR_METRIC_NAME || 'some_metric_name'
const labelNamePrefix = process.env.VAR_LABEL_NAME || 'some_label_name'
const labelValuePrefix = process.env.VAR_LABEL_VALUE || 'some_label_value'

function getCounter(name, labelNames) {
  const counter = new client[metricType]({ name, help: '...', labelNames })
  register.registerMetric(counter)
  return counter
}

const counters = []
const labels = []
for (let i = 0; i < metricsCount; i++) {
  if (!labels.length) {
    for (let j = 0; j < labelsCount; j++) {
      labels.push(`${labelNamePrefix}${j + 1}`)
    }
  }

  counters.push(getCounter(`${metricNamePrefix}${i + 1}_total`, labels))
}

function addValues() {
  for (let i = 0; i < eventsCount; i++) {
    for (let valueIndex = 1; valueIndex <= firstLabelValues; valueIndex++) {
      const labelsKeyValue = {
        [labels[0]]: `${labelValuePrefix}${valueIndex}`
      }

      labels.forEach((label, index) => {
        if (!index) return

        for (let otherValueIndex = 1; otherValueIndex <= otherLabelValues; otherValueIndex++) {
          labelsKeyValue[label] = `${labelValuePrefix}${otherValueIndex}`
          counters.forEach(counter => {
            counter.inc(Object.assign({}, labelsKeyValue), 1)
          })
        }
      })
    }
  }

  setTimeout(() => addValues(), interval)
}

addValues()

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', register.contentType)
  register.metrics().then(v => res.end(v))
})

const port = 1667
server.listen(port)
console.log(`Server started at ${port}...`)
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
