import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import * as tls_self_signed_cert from "@pulumi/tls-self-signed-cert";

const frontendECR = new aws.ecr.Repository("pulumi-idp-ecr-frontend", {
    forceDelete: true,
});

const backendECR = new aws.ecr.Repository("pulumi-idp-ecr-backend", {
    forceDelete: true,
});

const authToken = aws.ecr.getAuthorizationToken({
    registryId: "${ecr.registryId}",
});

new aws.ecr.LifecyclePolicy("pulumi-idp-ecr-lifecycle-policy-frontend", {
    repository: frontendECR.name,
    policy: JSON.stringify({
        rules: [{
            rulePriority: 1,
            description: "Expire images when they are more than 10 available",
            selection: {
                tagStatus: "any",
                countType: "imageCountMoreThan",
                countNumber: 10,
            },
            action: {
                type: "expire",
            },
        }],
    }),
});

new aws.ecr.LifecyclePolicy("pulumi-idp-ecr-lifecycle-policy-backend", {
    repository: backendECR.name,
    policy: JSON.stringify({
        rules: [{
            rulePriority: 1,
            description: "Expire images when they are more than 10 available",
            selection: {
                tagStatus: "any",
                countType: "imageCountMoreThan",
                countNumber: 10,
            },
            action: {
                type: "expire",
            },
        }],
    }),
});

const frontendImage = new docker.Image("pulumi-idp-frontend-image", {
    imageName: frontendECR.repositoryUrl,
    build: {
        platform: "linux/amd64",
        dockerfile: "../Dockerfile.frontend",
        context: "../."
    },
    skipPush: false,
    registry: {
        server: frontendECR.repositoryUrl,
        username: authToken.then(token => token.userName),
        password: authToken.then(token => token.password),
    },
})

const backendImage = new docker.Image("pulumi-idp-backend-image", {
    imageName: backendECR.repositoryUrl,
    build: {
        platform: "linux/amd64",
        dockerfile: "../Dockerfile.backend",
        context: "../."
    },
    skipPush: false,
    registry: {
        server: backendECR.repositoryUrl,
        username: authToken.then(token => token.userName),
        password: authToken.then(token => token.password),
    },
});


const region = aws.getRegion({}).then(region => region.name);

const availabilityZones = [
    pulumi.interpolate`${region}a`,
    pulumi.interpolate`${region}b`,
];

const vpc = new aws.ec2.Vpc("pulumi-idp-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    instanceTenancy: "default",
});

const routeTable = new aws.ec2.RouteTable("pulumi-idp-rt", {
    vpcId: vpc.id,
});
const internetGateway = new aws.ec2.InternetGateway("pulumi-idp-igw", {
    vpcId: vpc.id,
});
const route = new aws.ec2.Route("pulumi-idp-route", {
    routeTableId: routeTable.id,
    destinationCidrBlock: "0.0.0.0/0",
    gatewayId: internetGateway.id,
});

const subnet1 = new aws.ec2.Subnet("pulumi-idp-subnet1", {
    vpcId: vpc.id,
    cidrBlock: "10.0.0.0/24",
    availabilityZone: availabilityZones[0],
    mapPublicIpOnLaunch: true,
});
const subnet2 = new aws.ec2.Subnet("pulumi-idp-subnet2", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: availabilityZones[1],
    mapPublicIpOnLaunch: true,
});

new aws.ec2.RouteTableAssociation("pulumi-idp-subnet1-rt-assoc", {
    subnetId: subnet1.id,
    routeTableId: routeTable.id,
});

new aws.ec2.RouteTableAssociation("pulumi-idp-subnet2-rt-assoc", {
    subnetId: subnet2.id,
    routeTableId: routeTable.id,
});
const ecsCluster = new aws.ecs.Cluster("pulumi-idp-ecs-cluster", {
    configuration: {
        executeCommandConfiguration: {
            logging: "DEFAULT",
        },
    },
    settings: [{
        name: "containerInsights",
        value: "disabled",
    }],
});

new aws.ecs.ClusterCapacityProviders("pulumi-idp-cluster-capacity-providers", {
    clusterName: ecsCluster.name,
    capacityProviders: [
        "FARGATE",
        "FARGATE_SPOT",
    ],
});
const securityGroup = new aws.ec2.SecurityGroup("pulumi-idp-security-group", {
    vpcId: vpc.id,
    ingress: [
        {
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrBlocks: ["0.0.0.0/0"],
        },
        {
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrBlocks: ["0.0.0.0/0"],
        },
        {
            protocol: "tcp",
            fromPort: 8080,
            toPort: 8080,
            cidrBlocks: ["0.0.0.0/0"],
        }
    ],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

const loadBalancer = new aws.lb.LoadBalancer("pulumi-idp-load-balancer", {
    loadBalancerType: "application",
    securityGroups: [securityGroup.id],
    subnets: [
        subnet1.id,
        subnet2.id,
    ],
});

const cert = new tls_self_signed_cert.SelfSignedCertificate("cert", {
    dnsName: loadBalancer.dnsName,
    validityPeriodHours: 807660,
    localValidityPeriodHours: 17520,
    subject: {
        commonName: "example-cert",
        organization: "example-cert LLC",
    },
});

const certArn = new aws.acm.Certificate("pulumi-idp-cert", {
    certificateBody: cert.pem,
    privateKey: cert.privateKey,
});


const traefikTargetGroup = new aws.lb.TargetGroup("pulumi-idp-target-group", {
    port: 443,
    protocol: "HTTPS",
    targetType: "ip",
    vpcId: vpc.id,
    healthCheck: {
        interval: 30,
        path: "/ping",
        port: "8080",
        protocol: "HTTP",
        timeout: 5,
        healthyThreshold: 2,
    }
});

const traefikDashboardTargetGroup = new aws.lb.TargetGroup("dashboard-target-group", {
    port: 8080,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpc.id,
    healthCheck: {
        interval: 30,
        path: "/ping",
        protocol: "HTTP",
        timeout: 5,
        healthyThreshold: 2,
    }
});


const frontendTargetGroup = new aws.lb.TargetGroup("frontend-target-group", {
    port: 3000,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpc.id,
    healthCheck: {
        interval: 30,
        path: "/",
        protocol: "HTTP",
        timeout: 5,
        healthyThreshold: 2,
    }
})

const backendTargetGroup = new aws.lb.TargetGroup("backend-target-group", {
    port: 3000,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpc.id,
    healthCheck: {
        interval: 30,
        path: "/",
        protocol: "HTTP",
        timeout: 5,
        healthyThreshold: 2,
    }
})

const http = new aws.lb.Listener("pulumi-idp-listener-80", {
    loadBalancerArn: loadBalancer.arn,
    port: 443,
    protocol: "HTTPS",
    defaultActions: [{
        type: "forward",
        targetGroupArn: traefikTargetGroup.arn,
    }],
    certificateArn: certArn.arn,
    sslPolicy: "ELBSecurityPolicy-TLS13-1-2-2021-06"
});

const dashboard = new aws.lb.Listener("pulumi-idp-listener-8080", {
    loadBalancerArn: loadBalancer.arn,
    port: 8080,
    protocol: "HTTPS",
    defaultActions: [{
        type: "forward",
        targetGroupArn: traefikDashboardTargetGroup.arn,
    }],
    certificateArn: certArn.arn,
    sslPolicy: "ELBSecurityPolicy-TLS13-1-2-2021-06"
});


new aws.lb.ListenerRule("pulumi-idp-listener-rule-api", {
    listenerArn: http.arn,
    priority: 1,
    actions: [{
        type: "forward",
        targetGroupArn: backendTargetGroup.arn,
    }],
    conditions: [{
        pathPattern: {
            values: ["/api*"],
        }
    }],
})

new aws.lb.ListenerRule("pulumi-idp-listener-rule-frontend", {
    listenerArn: http.arn,
    priority: 2,
    actions: [{
        type: "forward",
        targetGroupArn: frontendTargetGroup.arn,
    }],
    conditions: [{
        pathPattern: {
            values: ["/*"],
        }
    }],
});

const logGroup = new aws.cloudwatch.LogGroup("pulumi-idp-log-group", {retentionInDays: 7});

const executionRole = new aws.iam.Role("pulumi-idp-execution-role", {
    assumeRolePolicy: JSON.stringify({
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ecs-tasks.amazonaws.com",
            },
        }],
        Version: "2012-10-17",
    }),
    managedPolicyArns: ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"],
});

const taskRole = new aws.iam.Role("pulumi-idp-task-role", {
        assumeRolePolicy: JSON.stringify({
            Statement: [
                {
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Principal: {
                        Service: "ecs-tasks.amazonaws.com",
                    }
                }
            ],
            Version: "2012-10-17",
        }),
        inlinePolicies: [
            {
                name: "ExecuteCommand",
                policy: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Action: [
                                "logs:CreateLogStream",
                                "logs:DescribeLogGroups",
                                "logs:DescribeLogStreams",
                                "logs:PutLogEvents",
                            ],
                            Effect: "Allow",
                            Resource: "*",
                        },
                        {
                            Action: [
                                "ecs:ListClusters",
                                "ecs:DescribeClusters",
                                "ecs:ListTasks",
                                "ecs:DescribeTasks",
                                "ecs:DescribeContainerInstances",
                                "ecs:DescribeServices",
                                "ecs:ListServices",
                                "ecs:DescribeContainerInstances",
                                "ecs:DescribeTaskDefinition",
                                "ec2:DescribeInstances",
                                "ssm:DescribeInstanceInformation"
                            ],
                            Effect: "Allow",
                            Resource: "*",
                        },
                    ],
                }),
            },
            {
                name: "DenyIAM",
                policy: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [{
                        Action: "iam:*",
                        Effect: "Deny",
                        Resource: "*",
                    }],
                }),
            },
        ],
    })
;

const cfg = new pulumi.Config();

/*
const taskDefinition = new aws.ecs.TaskDefinition("pulumi-idp-task-definition", {
    family: "loadbalancer",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    requiresCompatibilities: ["FARGATE"],
    containerDefinitions: pulumi.jsonStringify(
        [{
            name: "traefik-proxy",
            image: "traefik:v3.3.5",
            //entryPoint: [],
            portMappings: [
                {
                    //hostPort: 80,
                    protocol: "tcp",
                    containerPort: 80
                },
                {
                    //hostPort: 443,
                    protocol: "tcp",
                    containerPort: 443
                },
                {
                    //hostPort: 8080,
                    protocol: "tcp",
                    containerPort: 8080
                }
            ],
            command: [
                "--log.level=DEBUG",
                "--api.insecure=true",
                "--api.dashboard=true",
                "--ping=true",
                "--providers.ecs.autoDiscoverClusters=true",
                pulumi.interpolate`--providers.ecs.clusters=${ecsCluster.name}`,
                "--providers.ecs.exposedByDefault=false",
                "--entrypoints.web.address=:80",
                "--entryPoints.websecure.address=:443",
                "--serverstransport.insecureskipverify=true",
                "--accesslog=true",
                "--accesslog.format=json",
            ],
            essential: true,
            logConfiguration: {
                logDriver: "awslogs",
                options: {
                    "awslogs-group": logGroup.name,
                    "awslogs-region": region,
                    "awslogs-stream-prefix": "traefik",
                },
            },
        }]
    ),
});
 */
const frontendTaskDefinition = new aws.ecs.TaskDefinition("pulumi-idp-frontend-task-definition", {
    family: "frontend",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    requiresCompatibilities: ["FARGATE"],
    containerDefinitions: pulumi.jsonStringify(
        [{
            name: "frontend",
            image: frontendImage.repoDigest,
            cpu: 0,
            portMappings: [{
                containerPort: 3000,
                protocol: "tcp",
            }],
            environment: [
                {
                    name: "VITE_API_URL",
                    value: cfg.require("VITE_API_URL"),
                },
                {
                    name: "VITE_GITHUB_AUTH_URL",
                    value: cfg.require("VITE_GITHUB_AUTH_URL"),
                },
                {
                    name: "VITE_GITHUB_CLIENT_ID",
                    value: cfg.require("VITE_GITHUB_CLIENT_ID"),
                },
                {
                    name: "VITE_GITHUB_TOKEN_ENDPOINT",
                    value: cfg.require("VITE_GITHUB_TOKEN_ENDPOINT"),
                },
                {
                    name: "VITE_GITHUB_USER_API",
                    value: cfg.require("VITE_GITHUB_USER_API"),
                },
                {
                    name: "VITE_GITHUB_SCOPE",
                    value: cfg.require("VITE_GITHUB_SCOPE"),
                }
            ],
            dockerLabels: {
                "traefik.enable": "true",
                "traefik.http.routers.frontend.rule": "PathPrefix(`/`)",
                "traefik.http.routers.frontend.entrypoints": "web,websecure",
                "traefik.http.services.frontend.loadbalancer.server.port": "3000"
            },
            essential: true,
            logConfiguration: {
                logDriver: "awslogs",
                options: {
                    "awslogs-group": logGroup.name,
                    "awslogs-region": region,
                    "awslogs-stream-prefix": "pulumi-idp-frontend",
                },
            },
        }
        ]
    ),
})

const backendTaskDefinition = new aws.ecs.TaskDefinition("pulumi-idp-backend-task-definition", {
    family: "backend",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    requiresCompatibilities: ["FARGATE"],
    containerDefinitions: pulumi.jsonStringify(
        [{
            name: "backend",
            image: backendImage.repoDigest,
            cpu: 0,
            portMappings: [{
                containerPort: 3000,
                protocol: "tcp",
            }],
            environment: [
                {
                    name: "GITHUB_CLIENT_ID",
                    value: cfg.require("GITHUB_CLIENT_ID"),
                },
                {
                    name: "GITHUB_CLIENT_SECRET",
                    value: cfg.require("GITHUB_CLIENT_SECRET"),
                },
                {
                    name: "GITHUB_TOKEN",
                    value: cfg.require("GITHUB_TOKEN"),
                },
                {
                    name: "PULUMI_ACCESS_TOKEN",
                    value: cfg.require("PULUMI_ACCESS_TOKEN"),
                },
                {
                    name: "PULUMI_ORGANIZATION",
                    value: cfg.require("PULUMI_ORGANIZATION"),
                },
                {
                    name: "PULUMI_BASE_URL",
                    value: cfg.require("PULUMI_BASE_URL"),
                },
                {
                    name: "PULUMI_BLUEPRINT_GITHUB_LOCATION",
                    value: cfg.require("PULUMI_BLUEPRINT_GITHUB_LOCATION"),
                },
                {
                    name: "PULUMI_WORKLOAD_DEFINITION_LOCATION",
                    value: cfg.require("PULUMI_WORKLOAD_DEFINITION_LOCATION"),
                }
            ],
            dockerLabels: {
                "traefik.enable": "true",
                "traefik.http.routers.backend.rule": "PathPrefix(`/api`)",
                "traefik.http.routers.backend.entrypoints": "web",
                "traefik.http.services.backend.loadbalancer.server.port": "3000"
            },
            essential: true,
            logConfiguration: {
                logDriver: "awslogs",
                options: {
                    "awslogs-group": logGroup.name,
                    "awslogs-region": region,
                    "awslogs-stream-prefix": "pulumi-idp-backend",
                },
            },
        }
        ]
    ),
})

const ecsSecurityGroup = new aws.ec2.SecurityGroup("pulumi-idp-ecs-security-group", {
    vpcId: vpc.id,
    ingress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

const serviceDiscoveryNamespace = new aws.servicediscovery.PrivateDnsNamespace("pulumi-idp-service-discovery-namespace", {
    name: `pulumi-idp.local`,
    vpc: vpc.id,
});
/*
new aws.ecs.Service("pulumi-idp-service", {
    cluster: ecsCluster.arn,
    taskDefinition: taskDefinition.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        assignPublicIp: true,
        securityGroups: [ecsSecurityGroup.id],
        subnets: [
            subnet1.id,
            subnet2.id,
        ],
    },
    loadBalancers: [
        {
            targetGroupArn: traefikTargetGroup.arn,
            containerName: `traefik-proxy`,
            containerPort: 80,
        },
        {
            targetGroupArn: traefikDashboardTargetGroup.arn,
            containerName: `traefik-proxy`,
            containerPort: 8080,
        }
    ],
    schedulingStrategy: "REPLICA",
    serviceConnectConfiguration: {
        enabled: true,
        namespace: serviceDiscoveryNamespace.arn,
    },
});
*/
new aws.ecs.Service("pulumi-idp-frontend-service", {
    cluster: ecsCluster.arn,
    taskDefinition: frontendTaskDefinition.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        assignPublicIp: true,
        securityGroups: [ecsSecurityGroup.id],
        subnets: [
            subnet1.id,
            subnet2.id,
        ],
    },
    loadBalancers: [
        {
            targetGroupArn: frontendTargetGroup.arn,
            containerName: `frontend`,
            containerPort: 3000,
        }
    ],
    serviceConnectConfiguration: {
        enabled: true,
        namespace: serviceDiscoveryNamespace.arn,
    },
    schedulingStrategy: "REPLICA",
});

new aws.ecs.Service("pulumi-idp-backend-service", {
    cluster: ecsCluster.arn,
    taskDefinition: backendTaskDefinition.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        assignPublicIp: true,
        securityGroups: [ecsSecurityGroup.id],
        subnets: [
            subnet1.id,
            subnet2.id,
        ],
    },
    loadBalancers: [
        {
            targetGroupArn: backendTargetGroup.arn,
            containerName: `backend`,
            containerPort: 3000,
        }
    ],
    serviceConnectConfiguration: {
        enabled: true,
        namespace: serviceDiscoveryNamespace.arn,
    },
    schedulingStrategy: "REPLICA",
});

export const url = pulumi.interpolate`http://${loadBalancer.dnsName}`;
