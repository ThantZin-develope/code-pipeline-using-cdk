import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { SimpleSynthAction, CdkPipeline } from "@aws-cdk/pipelines";
export class WorkshopPipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
       const repo =  new codecommit.Repository(this, 'WorkshopRepo', {
            repositoryName: "WorkshopRepo"
        });
     //define artifact representing the sourccode 
     const sourceArtifact = new codepipeline.Artifact();
     

     //define artifact representing the cloud assembly
     const cloudAssemblyArtifact = new codepipeline.Artifact();

     const pipeline = new CdkPipeline(this , 'Pipeline', {
         pipelineName: 'WorkshipPipeline',
         cloudAssemblyArtifact: cloudAssemblyArtifact,

         sourceAction: new codepipeline_actions.CodeCommitSourceAction({
actionName: 'CodeCommit',
output: sourceArtifact,
repository: repo

         }),

         synthAction:SimpleSynthAction.standardNpmSynth({
             sourceArtifact,
             cloudAssemblyArtifact,
             buildCommand: 'npm run build'
         })
     })


    }
}