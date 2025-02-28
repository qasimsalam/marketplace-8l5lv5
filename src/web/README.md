# AI Talent Marketplace Web Frontend

## Overview

The web frontend for the AI Talent Marketplace is built with Next.js, React, and TailwindCSS. It provides a responsive, accessible, and performant user interface for connecting businesses with AI professionals.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Design System](#design-system)
- [Project Structure](#project-structure)
- [State Management](#state-management)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Quick Start

### Prerequisites

- Node.js (v18.x LTS or higher)
- pnpm (v8.x or higher)
- Docker (v24.x or higher) for containerized development

### Installation

```bash
# Clone the repository (if you haven't already)
git clone git@github.com:your-org/ai-talent-marketplace.git

# Navigate to the web directory
cd ai-talent-marketplace/src/web

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start the development server
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Architecture

### Tech Stack

- **Framework**: Next.js 13.x (App Router)
- **UI Library**: React 18.x
- **Styling**: TailwindCSS 3.x
- **State Management**: Redux Toolkit 1.9.x
- **Form Handling**: React Hook Form 7.x
- **API Client**: Axios 1.x
- **Testing**: Jest 29.x, React Testing Library 14.x, Cypress 12.x

### Design Principles

- **Mobile-first responsive design**
- **Component-based architecture**
- **Server-side rendering for performance and SEO**
- **Accessible by default (WCAG 2.1 Level AA compliant)**
- **Type-safe with TypeScript**

## Development Setup

### Local Development

```bash
# Start the development server
pnpm dev

# Run type checking
pnpm type-check

# Lint code
pnpm lint

# Format code
pnpm format
```

### Docker Development

```bash
# Build and start the container
docker compose up -d web

# View logs
docker compose logs -f web

# Stop the container
docker compose down
```

### Environment Variables

Create a `.env.local` file with the following variables:

```
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_API_VERSION=v1

# Authentication
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=your-auth0-audience

# Feature Flags
NEXT_PUBLIC_ENABLE_JUPYTER=true
NEXT_PUBLIC_ENABLE_MODEL_SHARING=true
```

## Design System

Our design system is implemented using TailwindCSS with a custom configuration to match our brand identity and UI requirements.

### Color Palette

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3E63DD',
          50: '#EEF2FF',
          100: '#D8E0FF',
          200: '#B0C2FF',
          300: '#8AA4FF',
          400: '#6586FF',
          500: '#3E63DD',
          600: '#2E4FB4',
          700: '#1F3B8B',
          800: '#102662',
          900: '#061439',
        },
        secondary: {
          DEFAULT: '#34D399',
          // ... similar scale
        },
        neutral: {
          DEFAULT: '#6B7280',
          // ... similar scale
        },
        // Additional colors
      }
    }
  }
}
```

### Typography

We use a system font stack for optimal performance:

```css
/* In globals.css */
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

body {
  font-family: var(--font-sans);
}

code, pre, kbd, samp {
  font-family: var(--font-mono);
}
```

### Spacing

We follow an 8-point grid system:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        // Base is 0.25rem = 4px
        // Default Tailwind scale works well with our 8-point grid
      }
    }
  }
}
```

### Components

All UI components should:

- Be fully responsive (mobile-first)
- Support dark mode
- Include proper ARIA attributes
- Handle loading and error states
- Include comprehensive tests
- Have Storybook documentation

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Authentication routes
│   ├── (dashboard)/      # Dashboard routes
│   ├── (public)/         # Public routes
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # Shared components
│   ├── common/           # Generic UI components
│   ├── dashboard/        # Dashboard specific components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   └── ui/               # Base UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers
│   ├── api/              # API client
│   ├── auth/             # Authentication helpers
│   └── utils/            # General utilities
├── store/                # Redux store
│   ├── slices/           # Redux slices
│   ├── middleware/       # Redux middleware
│   └── index.ts          # Store configuration
├── styles/               # Global styles
│   └── globals.css       # Global CSS
├── types/                # TypeScript type definitions
└── __tests__/            # Test files
```

## State Management

We use Redux Toolkit for global state management:

```typescript
// Example slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Job } from '@/types';

interface JobsState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [],
  loading: false,
  error: null,
};

export const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    fetchJobsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchJobsSuccess: (state, action: PayloadAction<Job[]>) => {
      state.jobs = action.payload;
      state.loading = false;
    },
    fetchJobsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchJobsStart, fetchJobsSuccess, fetchJobsFailure } = jobsSlice.actions;
export default jobsSlice.reducer;
```

For component-level state, use React's built-in hooks:

```tsx
const [isOpen, setIsOpen] = useState(false);
const toggleOpen = useCallback(() => setIsOpen(prev => !prev), []);
```

## Testing

### Unit Testing

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

Example test:

```tsx
// __tests__/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state correctly', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Integration Testing

```bash
# Run Cypress tests in browser
pnpm cypress:open

# Run Cypress tests headlessly
pnpm cypress:run
```

Example Cypress test:

```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should show validation errors for empty form submission', () => {
    cy.get('button[type="submit"]').click();
    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });

  it('should login successfully with valid credentials', () => {
    // Mocking the API response
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: { token: 'fake-token', user: { name: 'Test User' } }
    }).as('loginRequest');

    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, Test User').should('be.visible');
  });
});
```

## Deployment

### Build Process

```bash
# Build for production
pnpm build

# Start the production build locally
pnpm start
```

### CI/CD Pipeline

We use GitHub Actions for CI/CD:

1. On pull request:
   - Run linting
   - Run type checking
   - Run unit tests
   - Build the application

2. On merge to main:
   - Build the application
   - Run e2e tests
   - Deploy to staging
   - Run smoke tests

3. On release:
   - Deploy to production
   - Run smoke tests

### Docker Production Build

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Multi-Environment Configuration

We support multiple deployment environments:

- **Development**: Local development environment
- **Staging**: Pre-production environment for testing
- **Production**: Live environment for end users

Environment-specific configuration is managed through environment variables in the CI/CD pipeline.

## Contributing

### Code Style

We follow a strict code style enforced by ESLint and Prettier:

```bash
# Check code style
pnpm lint

# Fix code style issues
pnpm lint:fix

# Format code
pnpm format
```

### Git Workflow

1. Create a feature branch from `main`: `git checkout -b feature/your-feature-name`
2. Make your changes and commit using conventional commit messages
3. Push your branch and create a pull request
4. Wait for CI checks to pass and request review
5. After approval, merge your PR

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add new dashboard component
fix: resolve issue with form validation
docs: update README with environment setup instructions
style: improve button styling for better contrast
refactor: simplify job listing logic
test: add tests for profile component
chore: update dependencies
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/introduction/getting-started)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Cypress Documentation](https://docs.cypress.io/guides/overview/why-cypress)