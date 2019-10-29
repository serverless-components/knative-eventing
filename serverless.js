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
  sink: {
    kind: 'Service',
    apiVersion: `serving.knative.dev/${knativeVersion}`
  }
}

class KnativeEventing extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)

    const k8sCustom = this.getKubernetesClient(config.kubeConfigPath, kubernetes.CustomObjectsApi)

    let triggerExists = true
    try {
      await this.getTrigger(k8sCustom, config)
    } catch (error) {
      triggerExists = error.body.code === 404 ? false : true
    }

    let params = Object.assign({}, config)
    const manifest = this.getManifest(params)
    params = Object.assign(params, { manifest })
    if (triggerExists) {
      await this.patchTrigger(k8sCustom, params)
    } else {
      await this.createTrigger(k8sCustom, params)
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
    await this.deleteTrigger(k8sCustom, params)

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

  getManifest({ knativeGroup, name, namespace, filter, sink }) {
    return {
      apiVersion: `${knativeGroup}/${knativeVersion}`,
      kind: 'Trigger',
      metadata: {
        name,
        namespace
      },
      spec: {
        filter,
        subscriber: {
          ref: {
            apiVersion: sink.apiVersion,
            kind: sink.kind,
            name: sink.name
          }
        }
      }
    }
  }

  async createTrigger(k8s, { knativeGroup, namespace, manifest }) {
    return k8s.createNamespacedCustomObject(
      knativeGroup,
      knativeVersion,
      namespace,
      'triggers',
      manifest
    )
  }

  async getTrigger(k8s, { knativeGroup, namespace, name }) {
    return k8s.getNamespacedCustomObject(knativeGroup, knativeVersion, namespace, 'triggers', name)
  }

  async patchTrigger(k8s, { knativeGroup, namespace, name, manifest }) {
    return k8s.patchNamespacedCustomObject(
      knativeGroup,
      knativeVersion,
      namespace,
      'triggers',
      name,
      manifest,
      {
        headers: { 'Content-Type': 'application/merge-patch+json' }
      }
    )
  }

  async deleteTrigger(k8s, { knativeGroup, namespace, name }) {
    return k8s.deleteNamespacedCustomObject(
      knativeGroup,
      knativeVersion,
      namespace,
      'triggers',
      name,
      {
        apiVersion: `${knativeGroup}/${knativeVersion}`
      }
    )
  }
}

module.exports = KnativeEventing
