#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsTestsStack } from '../lib/aws-tests-stack';
import { WorkshopPipelineStack } from '../lib/pipeline-stack';
import { CustomPipeline } from '../lib/custompipe';

const app = new cdk.App();
const {autoScalingGPS} =new AwsTestsStack(app , 'Stack1', {env:{ account: '437243966461', region: 'us-east-1'} });

new CustomPipeline(app , 'Stack2', {autoScalingGps: autoScalingGPS , env:{ account: '437243966461', region: 'us-east-1'} });