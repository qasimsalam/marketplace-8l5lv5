###############################################################################
# Node.js Base Stage - For TypeScript services
###############################################################################
FROM node:18-alpine AS node-base
# node:18-alpine - version 18.x

# Install necessary build dependencies
RUN apk add --no-cache curl gnupg ca-certificates

WORKDIR /app

# Install global npm packages
RUN npm install -g typescript@4.9.5 ts-node@10.9.1 node-gyp@9.4.0
RUN npm config set --global production true

###############################################################################
# Python Base Stage - For AI/ML services
###############################################################################
FROM python:3.11-slim AS python-base
# python:3.11-slim - version 3.11.x

# Install necessary build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set up Python virtual environment
RUN python -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Upgrade pip and install poetry
RUN pip install --upgrade pip
RUN pip install poetry==1.6.1

###############################################################################
# Shared Builder Stage
###############################################################################
FROM node-base AS shared-builder

COPY src/backend/shared/ /app/shared/
WORKDIR /app/shared

# Install dependencies and build
RUN npm ci 
RUN npm run build

###############################################################################
# API Gateway Builder Stage
###############################################################################
FROM node-base AS api-gateway-builder

COPY src/backend/api-gateway/ /app/api-gateway/
COPY --from=shared-builder /app/shared/dist /app/shared/dist

WORKDIR /app/api-gateway

# Install dependencies and build
RUN npm ci
RUN npm run build

###############################################################################
# User Service Builder Stage
###############################################################################
FROM node-base AS user-service-builder

COPY src/backend/user-service/ /app/user-service/
COPY --from=shared-builder /app/shared/dist /app/shared/dist

WORKDIR /app/user-service

# Install dependencies and build
RUN npm ci
RUN npm run build

###############################################################################
# Payment Service Builder Stage
###############################################################################
FROM node-base AS payment-service-builder

COPY src/backend/payment-service/ /app/payment-service/
COPY --from=shared-builder /app/shared/dist /app/shared/dist

WORKDIR /app/payment-service

# Install dependencies and build
RUN npm ci
RUN npm run build

###############################################################################
# Job Service Builder Stage
###############################################################################
FROM python-base AS job-service-builder

COPY src/backend/job-service/ /app/job-service/
WORKDIR /app/job-service

# Install dependencies (without dev dependencies)
RUN poetry install --no-dev

###############################################################################
# AI Service Builder Stage
###############################################################################
FROM python-base AS ai-service-builder

COPY src/backend/ai-service/ /app/ai-service/
WORKDIR /app/ai-service

# Install dependencies (without dev dependencies)
RUN poetry install --no-dev

###############################################################################
# Collaboration Service Builder Stage
###############################################################################
FROM python-base AS collaboration-service-builder

COPY src/backend/collaboration-service/ /app/collaboration-service/
WORKDIR /app/collaboration-service

# Install dependencies (without dev dependencies)
RUN poetry install --no-dev

###############################################################################
# Production Stage
###############################################################################
FROM alpine:3.18 AS production
# alpine:3.18 - version 3.18.x

# Install Node.js, Python, and other dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    py3-pip \
    curl

WORKDIR /app

# Copy built Node.js/TypeScript services
COPY --from=api-gateway-builder /app/api-gateway/dist /app/api-gateway
COPY --from=api-gateway-builder /app/api-gateway/node_modules /app/api-gateway/node_modules
COPY --from=api-gateway-builder /app/api-gateway/package.json /app/api-gateway/

COPY --from=user-service-builder /app/user-service/dist /app/user-service
COPY --from=user-service-builder /app/user-service/node_modules /app/user-service/node_modules
COPY --from=user-service-builder /app/user-service/package.json /app/user-service/

COPY --from=payment-service-builder /app/payment-service/dist /app/payment-service
COPY --from=payment-service-builder /app/payment-service/node_modules /app/payment-service/node_modules
COPY --from=payment-service-builder /app/payment-service/package.json /app/payment-service/

# Copy built Python services
COPY --from=job-service-builder /app/job-service /app/job-service
COPY --from=job-service-builder /app/venv /app/venv

COPY --from=ai-service-builder /app/ai-service /app/ai-service
COPY --from=collaboration-service-builder /app/collaboration-service /app/collaboration-service

# Set environment variables
ENV NODE_ENV=production
ENV PYTHON_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV SERVICE_TYPE=""
ENV PATH="/app/venv/bin:$PATH"

# Create volumes for persistent data and logs
VOLUME /app/data
VOLUME /app/logs

# Expose port
EXPOSE 3000

# Set up health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Add startup script
COPY src/backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Create the entrypoint script content
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# Create data and logs directories if they don\'t exist\n\
mkdir -p /app/data\n\
mkdir -p /app/logs\n\
\n\
# Start the appropriate service based on SERVICE_TYPE\n\
case "$SERVICE_TYPE" in\n\
  "api-gateway")\n\
    echo "Starting API Gateway service..."\n\
    cd /app/api-gateway && node dist/index.js\n\
    ;;\n\
  "user-service")\n\
    echo "Starting User Service..."\n\
    cd /app/user-service && node dist/index.js\n\
    ;;\n\
  "payment-service")\n\
    echo "Starting Payment Service..."\n\
    cd /app/payment-service && node dist/index.js\n\
    ;;\n\
  "job-service")\n\
    echo "Starting Job Service..."\n\
    cd /app/job-service && python -m job_service.main\n\
    ;;\n\
  "ai-service")\n\
    echo "Starting AI Service..."\n\
    cd /app/ai-service && python -m ai_service.main\n\
    ;;\n\
  "collaboration-service")\n\
    echo "Starting Collaboration Service..."\n\
    cd /app/collaboration-service && python -m collaboration_service.main\n\
    ;;\n\
  "")\n\
    echo "ERROR: SERVICE_TYPE environment variable must be set"\n\
    exit 1\n\
    ;;\n\
  *)\n\
    echo "ERROR: Unknown service type: $SERVICE_TYPE"\n\
    exit 1\n\
    ;;\n\
esac\n\
' > /docker-entrypoint.sh