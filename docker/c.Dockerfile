FROM alpine:3.19
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
RUN adduser -D runner
USER runner