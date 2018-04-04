FROM node:carbon

RUN mkdir -p /usr/code
WORKDIR /usr/code

# Copies the entire application
COPY ./code /usr/code

# Exposes the HTTP port
EXPOSE 3000

# Runs the node application
CMD ["npm", "start"]
