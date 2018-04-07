[![Build Status](https://travis-ci.org/capcodigital/ideafunnel.svg?branch=master)](https://travis-ci.org/capcodigital/ideafunnel) [![codebeat badge](https://codebeat.co/badges/c0bdb938-ce8e-439c-be0a-eedc4573da0e)](https://codebeat.co/projects/github-com-capcodigital-ideafunnel-master)

# Installation Instructions

[![Join the chat at https://gitter.im/capcodigital/ideafunnel](https://badges.gitter.im/capcodigital/ideafunnel.svg)](https://gitter.im/capcodigital/ideafunnel?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Local Machine Setup

### Installation 

Required in order to run this application:

1. Node JS and Node Package Manager (npm comes along with node js so no extra steps needed)
2. Docker (for easy deployment)
3. Bower (needs node and npm: npm install -g bower)
4. Terraform CLI
5. Digital Ocean CLI 
6. brew
7. wget


### Host File

Use the following command...

``` shell
sudo nano /etc/hosts
```
Then add an entry for 
``` shell
127.0.0.1   ideas.capco.com
```

### Docker Compose 

A docker-composer configuration is created that spins up a mongo container,
builds the image of the app, spins the app and connects it with mongo.:

``` shell
docker-composer -p "if" up --scale app=2
```

## Alternative to docker-compose, you can manually build and deploy the app to a docker container:
// if you want to go down the manual route
Run mongo as a docker container:

``` shell
docker run --name some-mongo -d mongo
```

Find the IP of your mongo container, replace {NETWORK_ID} with the actual network id:
``` shell
docker network ls
docker network inspect {NETWORK_ID}
```

Build the application image for IdeaFunnel (this uses the Dockerfile):
``` shell
docker build -t ifapp .
```

Start the IdeaFunnel application, Replace {MONGODB_IP_ADDRESS} with the actual IP address:
``` shell
docker run -d -i -p 3000:3000 -e HOST="{MONGODB_IP_ADDRESS}" --name ifapp ifapp
```

## Terraform
To deploy the application on terraform you can use the following:
note that $DO_TOKEN is set as environment variable
``` shell
terraform apply \
-var token=$DO_TOKEN \
-var key_name=abcd-capco \
-var pub_key="/path/to/your/public/key/file/+filename" \
-var prv_key="/path/to/your/private/key/file/+filename" \
```

## Applications

To access the application...
http://ideas.capco.com

To access Portainer dashboard...
http://ideas.capco.com:9000

To access Traefic dashboard...
http://ideas.capco.com:8080


