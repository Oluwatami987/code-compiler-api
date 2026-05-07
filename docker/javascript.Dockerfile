FROM node:20-alpine
WORKDIR /app
RUN adduser -D runner
USER runner