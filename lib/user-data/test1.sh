#!/bin/bash
sudo su
yum -y update
yum install -y ruby
yum install -y aws-cli
yum install -y httpd
systemctl start httpd
systemctl enable httpd
cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
./install auto