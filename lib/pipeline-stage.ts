import { Construct, Stage, StageProps } from "@aws-cdk/core";
import { AwsTestsStack } from "./aws-tests-stack";


export class WorkshopPipelineStage extends Stage{

    constructor(scope: Construct, id:string , props?: StageProps){
        super(scope,id ,props );

        new AwsTestsStack(this , 'WebService');
    }
    
}