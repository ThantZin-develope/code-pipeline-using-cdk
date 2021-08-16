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
import { AmazonLinuxGeneration, InstanceClass, InstanceSize, InstanceType, MachineImage, Protocol } from '@aws-cdk/aws-ec2';
import { readFileSync } from 'fs';
import * as codebuild from '@aws-cdk/aws-codebuild';
import { Tags } from '@aws-cdk/core';
import { IpAddressType, ListenerAction, ListenerCondition, TargetType } from '@aws-cdk/aws-elasticloadbalancingv2';
import { LoadBalancer } from '@aws-cdk/aws-codedeploy';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';


export class AwsTestsStack extends cdk.Stack {

  public readonly autoScalingGPS:AutoScalingGroup[];
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const ec2roleforCodeDeployment = new role.Role(this , 'Ec2InstnaceRole', 
    {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'Ec2InstnaceRolefromCDK',
      managedPolicies: [
       {
         managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforAWSCodeDeploy'
       }
      ],

    }
    );

    //Create CustomVPC which has two public subnets with different AZ
    const myVpc = new ec2.Vpc(this, 'mycdkvpc', {
      cidr: '10.0.0.0/16',
      enableDnsHostnames: true,
      natGateways:1,
      enableDnsSupport: true,
      natGatewayProvider: ec2.NatProvider.gateway(),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'mypublicsubnet01',
          subnetType: ec2.SubnetType.PUBLIC
        }
      ],   
      
    });


    //Create Instance's SG which open port 80 for http access and port 22 for ssh access and allow all outbout rules
    const instanceSecurityGp = new ec2.SecurityGroup(this , 'MySecurityGroup', {
      allowAllOutbound: true,
      vpc: myVpc,
      securityGroupName: 'MyCustomSecurityGroup'
    });
    // Adding InboundRules
    instanceSecurityGp.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH Access' );
    instanceSecurityGp.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'Allow All Traffic Access');
    instanceSecurityGp.addIngressRule(ec2.Peer.anyIpv4() , ec2.Port.tcp(80), 'Open Port 80 in order to access Http');

//         const myec2Instance = new ec2.Instance(this , 'MyInstance', 
// {
//   vpc: myVpc,
//   securityGroup: instanceSecurityGp,
//   keyName: 'test',
//   allowAllOutbound: true,
  
//   instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
//   machineImage: MachineImage.latestAmazonLinux({
//     generation: AmazonLinuxGeneration.AMAZON_LINUX_2,

//   }),
//   role: ec2roleforCodeDeployment,
//   vpcSubnets: {
//     subnets: [
//       myVpc.publicSubnets[0]
//     ]
//   }
// }
//     );

//     Tags.of(myec2Instance).add('Name', 'MyCodePipelineDemo');

    
      //Get Userdata from user-data.sh file
       
      const userData = readFileSync('./lib/user-data/test1.sh', "utf8"); 


    // myec2Instance.addUserData(userData);


   //Create AutoScaling GP 1 that lunch instance on region a with subnet 1
    const autoscalingGp1 = new autoscale.AutoScalingGroup(this , 'MyCustomAutoScalingGroup', {
      vpc: myVpc,
      securityGroup: instanceSecurityGp,
      instanceType: ec2.InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux({
generation:AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
     minCapacity: 1,
     maxCapacity: 1,
     desiredCapacity: 1,
     keyName: 'test',
     
     role:ec2roleforCodeDeployment,
     allowAllOutbound: true,
     associatePublicIpAddress: true,
     vpcSubnets: {subnets: [myVpc.publicSubnets[0]]}
    }
    );
    Tags.of(autoscalingGp1).add('Name', 'MyCodePipelineDemo');
    autoscalingGp1.addUserData(
      userData
    );
 

   //register 2 desiredCapactiy when 8 am to 5 pm
    autoscalingGp1.scaleOnSchedule('During Office', {
schedule: autoscale.Schedule.cron({hour: '1'}),
desiredCapacity:1
    });

       
  //for region b
  const autoscalingGp2 = new autoscale.AutoScalingGroup(this , 'MyCustomAutoScalingGroup2', {
    vpc: myVpc,
    securityGroup: instanceSecurityGp,
    instanceType: ec2.InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
    machineImage: ec2.MachineImage.latestAmazonLinux({
generation:AmazonLinuxGeneration.AMAZON_LINUX_2
    }),
   minCapacity: 1,
   maxCapacity: 1,
   desiredCapacity: 1,
   keyName: 'test',
   role:ec2roleforCodeDeployment,
   allowAllOutbound: true,
   associatePublicIpAddress: true,
   vpcSubnets: {subnets: [myVpc.publicSubnets[1]]}
  }
  );

  Tags.of(autoscalingGp2).add('Name', 'MyCodePipelineDemo');
 
  autoscalingGp2.addUserData(
   userData
  );

  

  autoscalingGp2.scaleOnSchedule('morning schedule', {
schedule: autoscale.Schedule.cron({hour: '1'}),
desiredCapacity:1
  });
  
      //create loadbalancer which will distrube in coming traffic in these subnets
      const myapploadbalancer = new loadbalancer.ApplicationLoadBalancer(this , 'MyCustomAppLoadBalancer', {
        securityGroup: instanceSecurityGp,
        http2Enabled: true,
        ipAddressType: IpAddressType.IPV4,
        
        vpc: myVpc,
        vpcSubnets: {subnets: myVpc.publicSubnets} ,
        internetFacing: true,
        
      });
  // listen at port 80    
     const listener =   myapploadbalancer.addListener('port 80 listener', {
        port: 80,
        open: true,
        
      });
  
      const target1 = new loadbalancer.ApplicationTargetGroup(this , 'Target1' , {
       vpc: myVpc,
       port: 80,
       targetType: TargetType.INSTANCE,
       healthCheck: {
         path: '/',
         port:'80',
         protocol:loadbalancer.Protocol.HTTP
       }
       ,
            });

            const target2 = new loadbalancer.ApplicationTargetGroup(this , 'Target2' , {
              vpc: myVpc,
              port: 80,
              targetType: TargetType.INSTANCE,
              healthCheck: {
                path: '/',
                port:'80',
                protocol:loadbalancer.Protocol.HTTP
              }
              ,
                   });
       
         
     // register target gps to created loadbalancer
      listener.addTargetGroups('TargetGP1', {
       targetGroups: [target1]
     });
     listener.addTargetGroups('TargetGP1', {
      targetGroups: [target2]
    });
   
 
    autoscalingGp1.attachToApplicationTargetGroup(target1);
    autoscalingGp2.attachToApplicationTargetGroup(target2);
  
    listener.addAction('ForTarget1', {
      priority: 45,
      conditions: [
        ListenerCondition.httpRequestMethods(['GET'])
      ],
      action: ListenerAction.forward(
 [target1]
      )
    });
    listener.addAction('ForTarget2', {
      priority: 55,
      conditions: [
        ListenerCondition.httpRequestMethods(['POST'])
      ],
      action: ListenerAction.forward(
 [target2]
      )
    });


    this.autoScalingGPS = [autoscalingGp1, autoscalingGp2];


  
 

  }
    


  
}
