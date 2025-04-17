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
- Create a `.env` file in the root with the following contents:
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
