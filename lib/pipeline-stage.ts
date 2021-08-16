import { CfnOutput, Construct, Stage, StageProps } from "@aws-cdk/core";
import { AwsTestsStack } from "./aws-tests-stack";


export class WorkshopPipelineStage extends Stage{
    public readonly hcViewerUrl: CfnOutput; 
    constructor(scope: Construct, id:string , props?: StageProps){
        super(scope,id ,props );

    //    const service =  new AwsTestsStack(this , 'WebService');
       
    //    this.hcViewerUrl = service.hcEndpoint;
    }
    
}