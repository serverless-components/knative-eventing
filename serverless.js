const { isEmpty, mergeDeepRight } = require('ramda')
const { Component } = require('@serverless/core')

const defaults = {
  foo: 'bar'
}

class KnativeEventing extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)

    this.state = config
    await this.save()
    return this.state
  }

  async remove(inputs = {}) {
    let config = mergeDeepRight(defaults, inputs)
    if (isEmpty(config)) {
      config = this.state
    }

    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = KnativeEventing
