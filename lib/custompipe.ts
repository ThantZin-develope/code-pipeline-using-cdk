  


import * as cdk from '@aws-cdk/core';
import * as loadbalancer from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cp from '@aws-cdk/aws-codepipeline';



import * as cd from '@aws-cdk/aws-codedeploy';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as autoscale from '@aws-cdk/aws-autoscaling';
import * as role from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as pipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as s3deployment from '@aws-cdk/aws-s3-deployment';
import { ManagedPolicy, PolicyStatement, ServicePrincipal } from '@aws-cdk/aws-iam';
import { AmazonLinuxGeneration, InstanceClass, InstanceSize, InstanceType, MachineImage } from '@aws-cdk/aws-ec2';
import { readFileSync } from 'fs';
import * as codebuild from '@aws-cdk/aws-codebuild';
import { Tags } from '@aws-cdk/core';
import { IpAddressType, ListenerAction, ListenerCondition, TargetType } from '@aws-cdk/aws-elasticloadbalancingv2';
import { LoadBalancer } from '@aws-cdk/aws-codedeploy';




import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';

export interface CustomStackProps extends cdk.StackProps{
    autoScalingGps:AutoScalingGroup[];
} 

export class CustomPipeline extends cdk.Stack{

    constructor(scope: cdk.Construct, id: string, props: CustomStackProps){
        super(scope, id, props);

         //  create bucket source provider 
    const s3bucketprovider = new s3.Bucket(this , 'S3BucketProvider', {
        bucketName: 'awscodepipeline-bucketprovider',
        versioned: true,
        });
        
        const bucketDeployment = new s3deployment.BucketDeployment(this , 'S3BucketDeployment', {
    destinationBucket: s3bucketprovider,
    sources: [s3deployment.Source.asset('./assets')]
        });
        const mycdapplication = new cd.ServerApplication(this , 'MyCdApplication', {
            applicationName: 'MyCdApplicationWithCDK'
                });
          
               //CodeDeploy permissions that grants AWS CodeDeploy access to your target instances.
              const cddevelopmentGpRole = new role.Role(this , 'DevelopemntGpRole', {
                assumedBy: new ServicePrincipal('codedeploy.amazonaws.com'),
                roleName: 'CDDevelopmentGpRole',
                managedPolicies: [
                  {
                    managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole'
                  }
                ],
                
                    }); 
            
                const developmentGp = new cd.ServerDeploymentGroup(this , 'MyCDAppDevelopmentGroup', {
            deploymentGroupName: 'MyCDAppDevelopmentGroup',
            role: cddevelopmentGpRole,
            application: mycdapplication,
            autoScalingGroups: props.autoScalingGps,
            deploymentConfig: cd.ServerDeploymentConfig.ONE_AT_A_TIME,
            ec2InstanceTags: new cd.InstanceTagSet(
            {
              'Name': ['MyCodePipelineDemo']
            }
            ),
            
                });
          
          
              //Create AWSCodePipelineServiceRole 
                const pipelineserviceRole = new role.Role(this , 'ServiceRole', {
                  assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
                  roleName: 'PipelineServiceRole',
                  
                });
                const managedPolicy = new role.ManagedPolicy(this , 'test',{
                  managedPolicyName: 'AWSCodePipelineServiceRole',
                  
                } );
                
                managedPolicy.addStatements(new role.PolicyStatement({
                  effect: role.Effect.ALLOW,
                  resources: ['*'],
                  actions: ['iam:PassRole'],
                  conditions: {StringEqualsIfExists: {
                    "iam:PassedToService": [
                      "cloudformation.amazonaws.com",
                      "elasticbeanstalk.amazonaws.com",
                      "ec2.amazonaws.com",
                      "ecs-tasks.amazonaws.com"
                  ]
                }
              
              }
            
                }),
                new role.PolicyStatement({
                  effect: role.Effect.ALLOW,
                  resources: ['*'],
                  actions: ['*'],
                }),
               
                
                );
                pipelineserviceRole.addManagedPolicy(managedPolicy);
                
              
                const sourceOutput = new cp.Artifact();
              
                const sourceAction = new pipeline_actions.S3SourceAction({
                  actionName: 'Source',
                  bucket:s3bucketprovider,
                  bucketKey: 'SampleApp_Linux.zip',
                  output:sourceOutput,
                  variablesNamespace: 'SourceVariables',
                  trigger: pipeline_actions.S3Trigger.EVENTS
                });
               
              
                const deployAction = new pipeline_actions.CodeDeployServerDeployAction({actionName: 'Deploy', deploymentGroup: developmentGp, input: sourceOutput, variablesNamespace: 'DeployVariables'})
                
            
                const mycodepipeline = new cp.Pipeline(this , 'MyDemoCodePipeline', {
                  pipelineName: 'MyDemoCodePipeline',
                  role:pipelineserviceRole,
                  restartExecutionOnUpdate:true,
                  artifactBucket:s3.Bucket.fromBucketArn(this , 'ArtifactStoreBucket', 'arn:aws:s3:::codepipeline-us-east-1-60420493207'),
                  
                }) ;
                mycodepipeline.addStage({
                  
                  stageName: 'Source',
                  actions: [sourceAction]
                });
                mycodepipeline.addStage({
                  stageName: 'Deploy',
                  actions: [deployAction]
                });
    
    }
}