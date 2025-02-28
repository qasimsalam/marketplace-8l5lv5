# AI Talent Marketplace - Backend

This repository contains the backend services for the AI Talent Marketplace platform, a specialized platform designed to connect businesses with verified AI professionals for project-based work through an AI-powered recommendation engine, secure payment processing, and built-in collaboration tools.

## Architecture Overview

The backend follows a microservices architecture with the following components:

- **API Gateway** (Node.js/Express): Entry point for all client requests, handles routing, authentication, and rate limiting
- **User Service** (Node.js/TypeScript): Manages user accounts, profiles, and authentication
- **Job Service** (Python/FastAPI): Handles job posting, proposals, and AI-powered job matching
- **Payment Service** (Node.js/TypeScript): Processes secure payments, escrow, and milestone-based payments
- **Collaboration Service** (Python/FastAPI): Provides real-time collaboration tools including Jupyter notebooks
- **AI Service** (Python/FastAPI): Powers the recommendation engine, skills matching, and search functionality

The services communicate via RESTful APIs and message queues, with data stored across multiple specialized databases.

## Tech Stack

### Languages and Frameworks
- **Node.js** (v18.x LTS) with TypeScript for API Gateway, User Service, and Payment Service
- **Python** (v3.11.x) with FastAPI for Job Service, Collaboration Service, and AI Service
- **Express.js** for Node.js-based services
- **FastAPI** for Python-based services

### Databases and Caching
- **PostgreSQL** (v15.x): Primary database for structured data (users, jobs, payments)
- **MongoDB** (v6.x): Document store for unstructured data (messages, portfolios)
- **Redis** (v7.x): Caching, session management, and real-time features
- **Elasticsearch** (v8.x): Search and AI matching capabilities

### Infrastructure
- **Docker** & **Docker Compose**: Containerization and local development
- **Kubernetes**: Production deployment and orchestration
- **GitHub Actions**: CI/CD pipeline

## Prerequisites

Before setting up the development environment, ensure you have the following installed:

- Docker and Docker Compose
- Node.js (v18+) and npm
- Python 3.11+
- Git

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ai-talent-marketplace.git
cd ai-talent-marketplace/src/backend
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your local configuration and API keys
```

### 3. Start the Development Environment

```bash
# Install dependencies
npm install

# Bootstrap services (uses lerna for Node.js services)
npm run bootstrap

# Start all services using Docker Compose
npm run start:dev
```

This will start all services in development mode with hot reloading enabled.

### 4. Run Database Migrations

```bash
npm run db:migrate

# Seed the database with development data (optional)
npm run db:seed
```

## Service Details

### API Gateway

- **Port**: 8000
- **Technology**: Express.js (Node.js)
- **Responsibility**: Routes requests to appropriate microservices, handles authentication and authorization, rate limiting
- **Key Features**: JWT validation, request routing, monitoring

### User Service

- **Port**: 8001
- **Technology**: Express.js (Node.js)
- **Responsibility**: User management, authentication, profile management
- **Key Features**: User registration, login, profile management, skill verification

### Job Service

- **Port**: 8003
- **Technology**: FastAPI (Python)
- **Responsibility**: Job posting, proposals, matching algorithms
- **Key Features**: Job CRUD operations, proposal management, contract generation

### Payment Service

- **Port**: 8002
- **Technology**: Express.js (Node.js)
- **Responsibility**: Payment processing, escrow, milestone payments
- **Key Features**: Stripe integration, escrow services, transaction management

### Collaboration Service

- **Port**: 8005
- **Technology**: FastAPI (Python)
- **Responsibility**: Real-time collaboration, file sharing, Jupyter notebooks
- **Key Features**: WebSocket communication, file management, Jupyter integration

### AI Service

- **Port**: 8004
- **Technology**: FastAPI (Python)
- **Responsibility**: AI matching, skill analysis, recommendations
- **Key Features**: OpenAI integration, vector embeddings, ElasticSearch

## API Documentation

When running the services locally, API documentation is available at the following URLs:

- API Gateway: http://localhost:8000/docs
- User Service: http://localhost:8001/docs
- Job Service: http://localhost:8003/docs
- Payment Service: http://localhost:8002/docs
- Collaboration Service: http://localhost:8005/docs
- AI Service: http://localhost:8004/docs

The Python-based services use OpenAPI/Swagger for documentation, while Node.js services use Swagger UI.

## Testing

```bash
# Run all tests
npm test

# Run tests for a specific service
npm test -- --testPathPattern=user-service

# Run with coverage
npm test -- --coverage
```

## Database Migrations

Database migration files are located in the `db/migrations` directory and are executed sequentially.

```bash
# Run all migrations
npm run db:migrate

# Rollback migrations
npm run db:rollback
```

## Deployment

### Kubernetes Deployment

Kubernetes configuration files are provided in the `k8s` directory for production deployment:

```bash
# Apply all configurations
kubectl apply -f k8s/

# Apply configuration for a specific service
kubectl apply -f k8s/api-gateway.yaml
```

### Docker Images

Build and push Docker images for all services:

```bash
# Build all images
npm run docker:build

# Push images to registry
npm run docker:push
```

## Monitoring and Debugging

- Each service exposes a `/health` endpoint for health checks
- Prometheus metrics are available on `/metrics` endpoints
- Structured logging is implemented using Pino/Winston for Node.js services and the logging module for Python services

## Development Workflow

1. Create a feature branch from `main`
2. Implement changes
3. Add tests for new functionality
4. Run linting and tests:
   ```bash
   npm run lint
   npm test
   ```
5. Submit a pull request to `main`

## Troubleshooting

### Common Issues

- **Service won't start**: Check if ports are already in use
- **Database connection errors**: Verify database containers are running and credentials are correct
- **Authentication failures**: Ensure JWT secrets match across services

### Logs

Access logs for each service:

```bash
# View logs for a specific service
docker-compose logs -f user-service

# View logs for all services
docker-compose logs -f
```

## Contributing

Please follow the coding standards and commit message conventions defined in the team guidelines. All pull requests should include appropriate tests and documentation updates.

## License

Copyright (c) 2023 AI Talent Marketplace. All rights reserved.