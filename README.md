# Pulumi Internal Developer Portal

This is the Pulumi reference architecture for building an internal developer portal using the Pulumi platform and APIs.
The goal of this project is to provide a reference implementation of an internal developer portal that can be used as a
starting point for building your own internal developer portal using Pulumi as the underlying infrastructure as code
provider.

## Getting Started

### Prerequisites

- [Pulumi](https://pulumi.com/docs/get-started/install/) installed
- [Node.js](https://nodejs.org/en/download/) installed
- [Go](https://golang.org/dl/) installed
- [Docker](https://www.docker.com/get-started) installed
- [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) created

### Create GitHub OAuth App

- Go to your GitHub account and create a new OAuth app.
- Set the following values for local development or docker-compose:
    - **Homepage URL**: `http://localhost:8080`
    - **Authorization callback URL**: `http://localhost:8080/callback`
- Set the following values for production:
    - **Homepage URL**: `https://<your_domain_name>`
    - **Authorization callback URL**: `https://<your_domain_name>/callback`
- Get the `Client ID` and `Client Secret` from the OAuth app and set them in your environment variables.

### Setup in Pulumi Cloud

#### Workload Definition Fields

- Create in your Pulumi Cloud console a new environment project called `pulumi-idp` and the environment called `dev`
  with following
  content:
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

#### Prepare ESC environment

Have a look at the Blueprint repository for the Pulumi Blueprints that this IDP is using. The repository is located at
https://github.com/pulumi/blueprints.

The anatomy of a blueprint is as follows:

```Pulumi.yaml
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

The `template` tag is standard Pulumi templating, but interesting is the `esc:tag` tag. This tags fetches all the ESC
environments that are tagged with the key `esc` and a value. Here it is `aws`. This is the tag that is used to filter
and display the stages in the Create Workload form. This is important for blueprints creating infrastructure in the
cloud.

This will automatically create a new environment in the Pulumi Cloud console with the project name `esc-aws-typescript`
and the workload name as the environment name.

If you want to provide a stage for blueprint which uses this existing infrastructure, created by the IDP, you have to
create another environment. For example the blueprints `simple-webapp-ecs-aws-typescript` and
`simple-webapp-kubernetes-deployment`. Let's have a look at the `simple-webapp-ecs-aws-typescript` blueprint
which is located in the Pulumi Blueprints repository. The `Pulumi.yaml` file looks like this:

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

This blueprint expects ESC environments tagged with `esc` and `ecs`. Now for this particular blueprint you have to
create an environment with the `imports:` statement and including the environment with the cloud tag `esc:tag: aws`. And
then exporting the outputs of the `aws` environment. The environment looks like this:

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

This will import the existing ECS cluster and use it for the new workload. The `stackRefs` statement is used to
reference to the stack which is the shared infrastructure. The `pulumiConfig` statement is used to pass the
configuration to the blueprint. The `clusterArn` is the output of the ECS cluster and is used in the blueprint to create
the new ECS service.

This is the example for the `simple-webapp-kubernetes-deployment` blueprint. Imagine you create the workload based on the blueprint with the name 

```yaml
imports:
- pulumi-idp/aws-dev
values:
  stackRefs:
    fn::open::pulumi-stacks:
      stacks:
        aws:
          stack: kubernetes-aws-typescript/my-eks-cluster-dev
  kubeconfig: {'fn::toJSON': "${stackRefs.aws.kubeconfig}"}
  pulumiConfig:
    kubernetes:kubeconfig: ${kubeconfig}
  files:
    KUBECONFIG: ${kubeconfig}
```

This will export the kubeconfig of the shared EKS cluster and use it for the new workload.

### Local Deployment via Docker Compose

- Clone the repository
- Create a `.env` file in the `backend` directory with the following contents:
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
- Create a `.env.docker-compose` file in the root with the following contents:
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

- Run the following command to deploy the application:
    ```bash
    docker-compose up --build --force-recreate
    ```

- Open your browser and navigate to `http://localhost:8080` to view the application or `http://localhost:8081` to view
  the Traefik dashboard.

### Deployment via Pulumi

- Head over to the `deploy` folder.
- The Pulumi program is designed to run in `AWS` and uses `ECS` to deploy the application. The program is written in
  `Typescript` and uses the several different Pulumi packages to create the necessary resources.
    - Create in your Pulumi Cloud console under your organization a new environment called `pulumi-idp/deploy` to store
      all
      the environment variables and secrets.
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
- Authenticate against AWS.
- Run the following command to deploy the application:
    ```bash
    pulumi up
    ```
- Open your browser and navigate to the URL of the load balancer created by Pulumi to view the application.
