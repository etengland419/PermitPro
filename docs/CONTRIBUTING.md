# Contributing to PermitPro

Thank you for your interest in contributing to PermitPro! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Commit Messages](#commit-messages)
8. [Pull Request Process](#pull-request-process)
9. [Project Structure](#project-structure)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Age, body size, disability, ethnicity, gender identity
- Level of experience, nationality, personal appearance
- Race, religion, sexual orientation

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment, trolling, or derogatory comments
- Publishing private information without permission
- Conduct that could be considered inappropriate in a professional setting

### Enforcement

Violations can be reported to conduct@permitpro.com. All complaints will be reviewed and investigated promptly and fairly.

---

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ with PostGIS extension
- Redis 7+
- Git
- AWS CLI (for S3 access)
- Docker (optional, for local services)

### First Contribution

Good first issues are labeled with `good-first-issue`. These are typically:
- Documentation improvements
- Bug fixes with clear reproduction steps
- Small feature additions

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/PermitPro.git
cd PermitPro
```

### 2. Install Dependencies

```bash
# Install Node packages
npm install

# Or with Yarn
yarn install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your local configuration
nano .env
```

**Required environment variables:**
```bash
# Database
DATABASE_URL=postgresql://localhost:5432/permitpro_dev
REDIS_URL=redis://localhost:6379

# API Keys
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_MAPS_API_KEY=your_maps_api_key

# AWS (for local development, use LocalStack)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=permitpro-dev-documents

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NODE_ENV=development
PORT=3000
JWT_SECRET=your_random_secret_string
```

### 4. Database Setup

```bash
# Create database
createdb permitpro_dev

# Enable PostGIS extension
psql permitpro_dev -c "CREATE EXTENSION postgis;"

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 5. Start Development Server

```bash
# Start all services (API + Frontend)
npm run dev

# Or start individually
npm run dev:api      # API server on :3000
npm run dev:web      # Frontend on :5173
```

### 6. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

---

## Development Workflow

### Branch Naming Convention

```
feature/   - New features
bugfix/    - Bug fixes
hotfix/    - Urgent production fixes
refactor/  - Code refactoring
docs/      - Documentation changes
test/      - Test additions/fixes

Examples:
feature/auto-fill-engine
bugfix/permit-discovery-crash
docs/update-api-reference
```

### Workflow Steps

1. **Create a branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Write tests** for new functionality

4. **Run tests** locally:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Commit** with conventional commits (see below)

6. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request** on GitHub

---

## Coding Standards

### JavaScript/TypeScript

We use **ESLint** and **Prettier** for code quality and formatting.

**Run before committing:**
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run format      # Format with Prettier
```

### Style Guide

**General Rules:**
- Use TypeScript for all new code
- Prefer `const` over `let`, never use `var`
- Use descriptive variable names
- Keep functions small (< 50 lines)
- Extract magic numbers to named constants
- Add JSDoc comments for public APIs

**Good:**
```typescript
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validates uploaded file size and type
 * @param file - The uploaded file
 * @throws {ValidationError} If file is invalid
 */
function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(`File must be under ${MAX_FILE_SIZE_MB}MB`);
  }
}
```

**Bad:**
```javascript
function v(f) {
  if (f.size > 10485760) {  // Magic number!
    throw new Error('Too big');
  }
}
```

### React Components

**Functional components with hooks:**
```typescript
interface ProjectCardProps {
  project: Project;
  onSelect: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect
}) => {
  const handleClick = useCallback(() => {
    onSelect(project.id);
  }, [project.id, onSelect]);

  return (
    <div onClick={handleClick}>
      <h3>{project.name}</h3>
    </div>
  );
};
```

**Component organization:**
```
src/components/
  ProjectCard/
    ProjectCard.tsx          # Main component
    ProjectCard.test.tsx     # Tests
    ProjectCard.stories.tsx  # Storybook stories
    index.ts                 # Barrel export
```

### API Design

**RESTful conventions:**
```typescript
// Good
GET    /api/v1/projects           // List projects
POST   /api/v1/projects           // Create project
GET    /api/v1/projects/:id       // Get project
PATCH  /api/v1/projects/:id       // Update project
DELETE /api/v1/projects/:id       // Delete project

// Bad
GET /api/v1/getProjects
POST /api/v1/createNewProject
```

**Error responses:**
```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable code
    message: string;        // Human-readable message
    details?: object;       // Additional context
  };
}

// Example
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid project data",
    "details": {
      "fields": {
        "description": "Description is required"
      }
    }
  }
}
```

---

## Testing Guidelines

### Test Coverage Requirements

- **Unit tests**: 80% coverage minimum
- **Integration tests**: All API endpoints
- **E2E tests**: Critical user flows

### Writing Tests

**Unit Test Example:**
```typescript
import { calculatePermitFee } from './permitFee';

describe('calculatePermitFee', () => {
  it('should calculate base fee for simple projects', () => {
    const fee = calculatePermitFee({
      baseFee: 100,
      squareFootage: 200,
      formula: null
    });

    expect(fee).toBe(100);
  });

  it('should apply square footage multiplier', () => {
    const fee = calculatePermitFee({
      baseFee: 50,
      squareFootage: 200,
      formula: '$50 + $0.50 per sq ft'
    });

    expect(fee).toBe(150); // 50 + (200 * 0.50)
  });
});
```

**Integration Test Example:**
```typescript
import request from 'supertest';
import app from '../app';

describe('POST /api/v1/projects', () => {
  it('should create a new project', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Deck',
        description: 'Building a deck',
        projectType: 'deck',
        address: { /* ... */ }
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Deck');
  });

  it('should return 401 without auth token', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .send({});

    expect(response.status).toBe(401);
  });
});
```

### Test Organization

```
src/
  components/
    ProjectCard/
      ProjectCard.test.tsx       # Component tests
  services/
    permitDiscovery.test.ts     # Service tests
  utils/
    validation.test.ts           # Utility tests
  __tests__/
    integration/
      api/
        projects.test.ts         # API integration tests
    e2e/
      project-submission.test.ts # End-to-end tests
```

---

## Commit Messages

We follow **Conventional Commits** specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting changes (not code logic)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat(permit-discovery): add building code matching

Implement AI-powered building code matching for discovered permits.
Uses Claude API to analyze project details and match relevant codes
from IBC, NEC, and local amendments.

Closes #123
```

```
fix(auth): prevent token refresh race condition

Multiple simultaneous requests were causing token refresh conflicts.
Added mutex lock to ensure only one refresh happens at a time.

Fixes #456
```

```
docs(api): update OpenAPI specification for permits endpoint

- Add missing query parameters
- Fix response schema examples
- Document error codes
```

### Commit Message Rules

1. Use imperative mood ("add" not "added" or "adds")
2. First line max 72 characters
3. Separate subject from body with blank line
4. Reference issues/PRs in footer
5. Use body to explain "what" and "why" vs. "how"

---

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Documentation updated (if needed)
- [ ] Changeset added (`npm run changeset`)

### PR Title Format

Use conventional commit format:
```
feat(scope): description
fix(scope): description
docs: description
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged

## Related Issues
Closes #123
Related to #456
```

### Review Process

1. **Automated checks**: Must pass CI/CD pipeline
2. **Code review**: Requires 1 approval from core team
3. **Security review**: Required for auth/payment changes
4. **Performance review**: Required for database changes

### After Approval

- **Squash and merge** for feature branches
- **Rebase and merge** for hotfixes
- Delete branch after merge

---

## Project Structure

```
PermitPro/
├── src/
│   ├── api/              # API routes
│   │   ├── auth/
│   │   ├── projects/
│   │   └── permits/
│   ├── components/       # React components
│   │   ├── common/
│   │   ├── projects/
│   │   └── permits/
│   ├── services/         # Business logic
│   │   ├── permitDiscovery/
│   │   ├── autoFill/
│   │   └── submission/
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   └── config/           # Configuration
├── docs/                 # Documentation
├── tests/                # Test suites
├── diagrams/             # Architecture diagrams
├── migrations/           # Database migrations
└── scripts/              # Build/deploy scripts
```

---

## Questions?

- **Slack**: #permitpro-dev
- **Email**: dev@permitpro.com
- **Office Hours**: Tuesdays 2-3 PM PST

Thank you for contributing to PermitPro!
