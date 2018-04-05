FROM node:carbon

RUN mkdir -p /usr/src/ideafunnel
WORKDIR /usr/src/ideafunnel

# Adds the files holding the dependencies
COPY ./src/package*.json ./src/bower.json /usr/src/ideafunnel/

RUN npm install --python=python2.7
RUN npm install -g bower
RUN bower install --allow-root

RUN mkdir /usr/src/ideafunnel/public
RUN mkdir /usr/src/ideafunnel/public/bower
RUN mv bower_components/* /usr/src/ideafunnel/public/bower

# Copies the entire application
COPY ./src /usr/src/ideafunnel

# Exposes the HTTP port
EXPOSE 3000

# Runs the node application
CMD ["npm", "start"]
