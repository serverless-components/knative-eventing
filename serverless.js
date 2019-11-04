const path = require('path')
const { isEmpty, mergeDeepRight } = require('ramda')
const kubernetes = require('@kubernetes/client-node')
const { Component } = require('@serverless/core')

const knativeVersion = 'v1alpha1'

const defaults = {
  kubeConfigPath: path.join(process.env.HOME, '.kube', 'config'),
  knativeGroup: 'eventing.knative.dev',
  knativeVersion,
  namespace: 'default',
  kind: 'Trigger'
}

class KnativeEventing extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)

    const k8sCustom = this.getKubernetesClient(config.kubeConfigPath, kubernetes.CustomObjectsApi)

    let eventExists = true
    try {
      await this.getEvent(k8sCustom, config)
    } catch (error) {
      eventExists = error.response.statusCode === 404 ? false : true
    }

    let params = Object.assign({}, config)
    const manifest = this.getManifest(params)
    params = Object.assign(params, { manifest })
    if (eventExists) {
      await this.patchEvent(k8sCustom, params)
    } else {
      await this.createEvent(k8sCustom, params)
    }

    this.state = config
    await this.save()
    return this.state
  }

  async remove(inputs = {}) {
    let config = mergeDeepRight(defaults, inputs)
    if (isEmpty(config)) {
      config = this.state
    }

    const k8sCustom = this.getKubernetesClient(config.kubeConfigPath, kubernetes.CustomObjectsApi)

    let params = Object.assign({}, config)
    const manifest = this.getManifest(params)
    params = Object.assign(params, { manifest })
    await this.deleteEvent(k8sCustom, params)

    this.state = {}
    await this.save()
    return {}
  }

  // "private" methods
  getKubernetesClient(configPath, type) {
    let kc = new kubernetes.KubeConfig()
    kc.loadFromFile(configPath)
    kc = kc.makeApiClient(type)
    return kc
  }

  getManifest({ knativeGroup, name, namespace, kind, spec }) {
    return {
      apiVersion: `${knativeGroup}/${knativeVersion}`,
      kind,
      metadata: {
        name,
        namespace
      },
      spec
    }
  }

  async createEvent(k8s, { knativeGroup, namespace, kind, manifest }) {
    return k8s.createNamespacedCustomObject(
      knativeGroup,
      knativeVersion,
      namespace,
      `${kind.toLowerCase()}s`,
      manifest
    )
  }

  async getEvent(k8s, { knativeGroup, namespace, kind, name }) {
    return k8s.getNamespacedCustomObject(
      knativeGroup,
      knativeVersion,
      namespace,
      `${kind.toLowerCase()}s`,
      name
    )
  }

  async patchEvent(k8s, { knativeGroup, namespace, kind, name, manifest }) {
    return k8s.patchNamespacedCustomObject(
      knativeGroup,
      knativeVersion,
      namespace,
      `${kind.toLowerCase()}s`,
      name,
      manifest,
      {
        headers: { 'Content-Type': 'application/merge-patch+json' }
      }
    )
  }

  async deleteEvent(k8s, { knativeGroup, namespace, kind, name }) {
    return k8s.deleteNamespacedCustomObject(
      knativeGroup,
      knativeVersion,
      namespace,
      `${kind.toLowerCase()}s`,
      name,
      {
        apiVersion: `${knativeGroup}/${knativeVersion}`
      }
    )
  }
}

module.exports = KnativeEventing
