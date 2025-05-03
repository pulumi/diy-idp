# Pulumi DIY Internal Developer Portal

![Pulumi DIY IDP](img.png)

A **reference architecture** that turns Pulumi into your team’s self‑service power tool. Clone it, tweak it, and ship an **Internal Developer Portal (IDP)** that lets engineers spin up production‑ready infrastructure in minutes—all governed by your Pulumi program, policy, and best practices.

## 🌟 What’s inside?

| Capability                                                                   | Why it matters                                                                                                                                                                                              |
|------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Pulumi Cloud & [ESC](https://www.pulumi.com/product/secrets-management/)** | Centrally manage configs, secrets, and stack references—no more wiki pages of copy/paste variables.                                                                                                         |
| **Blueprint‑driven Workloads**                                               | Ship new services from [golden paths](https://cloud.google.com/blog/products/application-development/golden-paths-for-engineering-execution-consistency) (ECS, EKS, Web Apps, and more) with **one click**. |
| **GitHub OAuth SSO**                                                         | Secure login that maps GitHub teams straight onto your portal’s RBAC model.                                                                                                                                 |
| **Docker‑Compose or AWS ECS** deploy\*\*                                     | Try it locally first, then promote to production with the *same* code.                                                                                                                                      |


## ⚡ Quick start (local)

```bash
# 1. Clone & switch into the repo
$ git clone https://github.com/your‑org/pulumi-idp.git && cd pulumi-idp

# 2. Fill in GitHub and Pulumi creds (see **Prerequisites** below)
$ cp backend/.env.example backend/.env

# 3. Launch everything
$ docker‑compose up --build --force-recreate
```

Browse to [**http://localhost:8080**](http://localhost:8080) (portal) or [**http://localhost:8081**](http://localhost:8081) (Traefik dashboard) and start creating workloads! 🎉

Want the production setup? Skip down to [Production deployment with Pulumi (AWS ECS)](#-deployment-via-pulumi-aws-ecs).


## 📋 Table of contents

1. [Overview](#-overview)
  1. [What is an Internal Developer Portal (IDP)?](#what-is-an-internal-developer-portal-idp)
  2. [What is a Blueprint?](#what-is-a-blueprint)
  3. [What is Workload?](#what-is-workload)
1. [Prerequisites](#-prerequisites)
2. [Create the GitHub OAuth App](#-create-github-oauth-app)
3. [Pulumi Cloud setup](#-setup-in-pulumi-cloud)
  1. [Workload definition fields](#workload-definition-fields)
  2. [ESC environments & blueprints](#prepare-esc-environment)
4. [Local deployment with Docker Compose](#-local-deployment-via-docker-compose)
5. [Production deployment with Pulumi (AWS ECS)](#-deployment-via-pulumi-aws-ecs)

## 👨‍🏫 Overview

### What is an Internal Developer Portal (IDP)?

An **Internal Developer Portal (IDP)** is a self-service platform that allows developers to create, manage, and deploy workloads in a consistent and secure manner. It provides a user-friendly interface for developers to interact with the underlying infrastructure and services.

### What is a Blueprint?

A **blueprint** is a reusable, parameterized Pulumi program that defines a workload. It’s the **golden path** for your team to create workloads consistently. Normally, **blueprints** are created by the platform engineering team, but they can also be created by developers.

### What is Workload?

A **workload** is a concrete instance of a blueprint. It’s the actual Pulumi stack that gets deployed to your cloud provider. Workloads are created by developers using the portal and depending on the needs it could be completely created with a no-code. 

## 🛠 Prerequisites

Make sure the following tools (and accounts) are ready to roll:

* [Pulumi CLI](https://pulumi.com/docs/get-started/install/) v3+
* [Node.js](https://nodejs.org/en/download/) (LTS)
* [Go](https://golang.org/dl/) 1.22+
* [Docker](https://www.docker.com/get-started)
* A **GitHub OAuth App** (we’ll configure it next)


## 🔑 Create GitHub OAuth App

1. In your GitHub **Settings → Developer settings → OAuth Apps**, click **New OAuth App**.
2. Use these settings **for *****local***** dev / Docker‑Compose**:

  * **Homepage URL**: `http://localhost:8080`
  * **Authorization callback URL**: `http://localhost:8080/callback`
3. Use these settings **for production** (replace `<your_domain_name>`):

  * **Homepage URL**: `https://<your_domain_name>`
  * **Authorization callback URL**: `https://<your_domain_name>/callback`
4. Copy the **Client ID** and **Client Secret**—you’ll use them in upcoming `.env` files and Pulumi configs.


## 🏗 Setup in Pulumi Cloud

### Workload definition fields

Create a **Pulumi Environment Project** named `pulumi-idp`, then an **Environment** called `dev` with this YAML:

```yaml
values:
  workload:
    properties:
      - name: name
        type: string
        title: Workload Name
      - name: team
        type: $ref/teams
        title: Team
      - name: blueprint
        type: string
        title: Blueprint
      - name: projectId
        type: $ref/projects
        title: Project ID
      - name: cookiecut
        type: boolean
        title: Cookiecut blueprint
        required: false
```

### Prepare ESC environment

All blueprints live in [`pulumi/blueprints`](https://github.com/pulumi/blueprints). Each blueprint advertises the **cloud provider** it needs via the `esc:tag` label so the portal can surface the right stages.

```yaml
name: ecs-aws-typescript
author: Platform engineering team
description: |
  An Amazon Elastic Container Service (ECS) on AWS using Pulumi:
  * Creates an ECS Cluster

runtime:
  name: nodejs
  options:
    packagemanager: npm

config:
  pulumi:tags:
    value:
      pulumi:template: ecs-aws-typescript
      idp:blueprintIcon: container
      idp:blueprintType: ecs
      idp:blueprintLifecycle: development
      idp:blueprintVersion: 0.2.0
  esc:tag: aws

template:
  displayName: Elastic Container Service (ECS) on AWS
  description: |
    An Amazon Elastic Container Service (ECS) on AWS using Pulumi:
    * Creates an ECS Cluster
  config:
    aws:region:
      default: eu-central-1
```

#### Prepare the ESC environments for shared infrastructure

As a platform engineering team, you need to set up the **Pulumi ESC** environment for shared infrastructure. The shared infrastructure will be deployed also using our IDP and one of the blueprints.

That your developers can create workloads, you need to set up the **Pulumi ESC** environment beforehand. This is a one-time setup with all the variables and secrets needed to deploy the workloads. At a minimum, you need to set up the following:

```yaml
values:
  environmentVariables:
    AWS_ACCESS_KEY_ID: ${aws.creds.accessKeyId}
    AWS_SECRET_ACCESS_KEY: ${aws.creds.secretAccessKey}
    AWS_SESSION_TOKEN: ${aws.creds.sessionToken}
    AWS_REGION: ${aws.region}
  aws:
    region: eu-central-1
    creds:
      fn::open::aws-login:
        oidc:
          roleArn: arn:aws:iam::<your_aws_account_id>:role/<your_aws_role>
          sessionName: pulumi-environments-session
          duration: 1h
```

This will provide the necessary AWS credentials to deploy the workloads. You can also set up other environment variables as needed. Name the environment `pulumi-idp/aws-dev`. Tag the environment with the tag label `esc` and the value `aws` to make it available for the workloads. This will allow the portal to use this environment when deploying the workloads.

Now you need to set up the Pulumi ESC environment for the shared infrastructure you created, which exposes the `clusterArn` to the workloads. This is done by creating a new environment with the following YAML:

```yaml
imports:
- pulumi-idp/aws-dev
values:
  stackRefs:
    fn::open::pulumi-stacks:
      stacks:
        aws:
          stack: ecs-aws-typescript/my-ecs-cluster
  pulumiConfig:
    clusterArn: ${stackRefs.aws.clusterArn}
```

Tag the environment with the tag label `esc` and the value `ecs` to make it available for the workloads. Name the environment `pulumi-idp/ecs-dev`. This will allow the portal to use this environment when deploying the workloads.

Now let's have a look at a `bluerpint` that deploys a workload on the shared infrastructure, we just created in the steps above:

```yaml
name: simple-webapp-ecs-aws-typescript
author: Platform engineering team
description: |
  A simple web application running on AWS Elastic Container Service (ECS) using Pulumi:
  
  * Creates an Load Balancer
  * Creates an ECS Service
  * Creates an ECS Task Definition

runtime:
  name: nodejs
  options:
    packagemanager: npm

config:
  pulumi:tags:
    value:
      pulumi:template: simple-webapp-ecs-aws-typescript
      idp:blueprintIcon: panel-top
      idp:blueprintType: webapp
      idp:blueprintLifecycle: development
      idp:blueprintVersion: 0.3.0
  esc:tag: ecs

template:
  displayName: Simple Webapp ECS AWS Deployment
  description: |
    A simple web application running on AWS Elastic Container Service (ECS) using Pulumi:
    
    * Creates an Load Balancer
    * Creates an ECS Service
    * Creates an ECS Task Definition

  config:
    aws:region:
      default: eu-central-1
    imageName:
      default: "nginx:latest"
    containerPort:
      default: "80"
    cpu:
      default: "512"
    memory:
      default: "128"
```

Here we can see that we are using the `esc:tag` label to tag the blueprint with the value `ecs`. This will make it available for the workloads that are deployed on the shared infrastructure and uses the `pulumi-idp/ecs-dev` environment.

Same pattern works for EKS workloads that need a `kubeconfig`. 🤝

Once setup this upfront work, your developers can create workloads using the portal and the shared infrastructure will be used automatically.

> The next version of this IDP will take care to show only blueprints that are allowed to be used depending on the group the user belongs to. This information will be read out from a directory like Azure Entra or AWS Cognito.

## 🐳 Local Deployment via Docker Compose

1. **Clone** the repository.

2. In `backend/`, create a `.env` file containing ⬇️:

   ```bash
   GITHUB_CLIENT_ID=<your_github_client_id>
   GITHUB_CLIENT_SECRET=<your_github_client_secret>
   GITHUB_TOKEN=<your_github_token>
   PULUMI_ACCESS_TOKEN=<your_pulumi_access_token>
   PULUMI_ORGANIZATION=<your_pulumi_organization>
   PULUMI_BASE_URL=https://api.pulumi.com/api
   PULUMI_BLUEPRINT_GITHUB_LOCATION=dirien/blueprints
   PULUMI_WORKLOAD_DEFINITION_LOCATION=pulumi-idp/dev
   ```

3. At repo root, create `.env.docker-compose` (front‑end env vars):

   ```bash
   MODE=production
   VITE_API_URL=/
   VITE_GITHUB_AUTH_URL=https://github.com/login/oauth/authorize
   VITE_GITHUB_CLIENT_ID=<your_github_client_id>
   VITE_GITHUB_TOKEN_ENDPOINT=/api/github/token
   VITE_GITHUB_USER_API=https://api.github.com/user
   VITE_GITHUB_SCOPE=read:user user:email
   VITE_GITHUB_ORG_NAME=<your_github_org_name>
   ```

4. **Run** the stack:

```bash
docker-compose up --build --force-recreate
```

5. Open [**http://localhost:8080**](http://localhost:8080) (IDP) or [**http://localhost:8081**](http://localhost:8081) (Traefik) to explore.


## 🚀 Deployment via Pulumi (AWS ECS)

1. `cd deploy`

2. In Pulumi Cloud, under your org, create **Environment** `pulumi-idp/deploy` with the following YAML:

   ```yaml
   values:
     pulumiConfig:
       GITHUB_CLIENT_ID: <your_github_client_id>
       GITHUB_CLIENT_SECRET: <your_github_client_secret>
       GITHUB_TOKEN: <your_github_token>
       PULUMI_ACCESS_TOKEN: <your_pulumi_access_token>
       PULUMI_ORGANIZATION: <your_pulumi_organization>
       PULUMI_BASE_URL: https://api.pulumi.com/api
       PULUMI_BLUEPRINT_GITHUB_LOCATION: pulumi/blueprints
       PULUMI_WORKLOAD_DEFINITION_LOCATION: pulumi-idp/dev
       MODE: production
       VITE_API_URL: /
       VITE_GITHUB_AUTH_URL: https://github.com/login/oauth/authorize
       VITE_GITHUB_CLIENT_ID: <your_github_client_id>
       VITE_GITHUB_TOKEN_ENDPOINT: /api/github/token
       VITE_GITHUB_USER_API: https://api.github.com/user
       VITE_GITHUB_SCOPE: read:user user:email
       VITE_GITHUB_ORG_NAME: <your_github_org_name of the oauth app>
   ```

3. Authenticate to AWS (e.g., `aws sso login` or env vars).

4. Deploy!

   ```bash
   pulumi up
   ```

5. Grab the load balancer URL from the Pulumi outputs, open it in your browser, and enjoy your production‑grade IDP. 🏁

## 🙌 Contributing

Found an issue? Want to ship a new blueprint? PRs are welcome—just follow the [contribution guidelines](CONTRIBUTING.md).

## 📄 License

Apache 2.0 © Pulumi Corp.
