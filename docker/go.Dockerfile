FROM golang:1.22-alpine
WORKDIR /app
RUN adduser -D runner
USER runner