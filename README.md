# knative-eventing

Instantly create and update [Knative eventing](https://knative.dev/docs/eventing/) definitions running on top of your Kubernetes cluster with [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;

### 1. Install

```console
$ npm install -g serverless
```

### 2. Create

Just create a `serverless.yml` file

```console
$ touch serverless.yml
```

Make sure that you have generated your [`Kubeconfig` file](https://rancher.com/docs/rancher/v2.x/en/cluster-admin/kubeconfig/) via `kubectl`.

### 3. Configure

```yml
# serverless.yml

myKnativeEventDefinition:
  component: '@serverless/knative-eventing'
  inputs:
    kubeConfigPath: ../kubeconfig # default is `~/.kube/config`
    knativeGroup: eventing.knative.dev # default is `eventing.knative.dev`
    knativeVersion: v1alpha1 # default is `v1alpha1`
    namespace: 'default' # default is `'default'`
    kind: 'Trigger' # default is `'Trigger'`
    name: my-knative-event
    spec: # eventing specification
      filter:
        attributes:
          type: dev.knative.foo.bar
      subscriber:
        ref:
          name: my-knative-service
          kind: 'Service'
          apiVersion: 'serving.knative.dev/v1alpha1'
```

### 4. Deploy

```console
$ serverless
```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
