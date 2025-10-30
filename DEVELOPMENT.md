# BudgetUp Development Guide

This guide covers the development workflow, tools, and best practices for BudgetUp.

## Prerequisites

- **Node.js**: 18.x or higher
- **pnpm**: 9.x or higher (recommended package manager)
- **Supabase CLI**: For database management
- **Git**: For version control

## Getting Started

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd budgetup

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# Get these from your Supabase project settings
```

### 2. Verify Environment

```bash
# Run environment verification
pnpm run verify:env

# This checks:
# - Node.js version
# - pnpm installation
# - Required environment variables
# - Environment variable format validation
```

### 3. Start Development Server

```bash
# Start the development server
pnpm dev

# The app will be available at http://localhost:3000
```

## Development Scripts

### Code Quality

```bash
# Run all quality checks
pnpm run check-all

# Individual checks
pnpm run type-check    # TypeScript compilation
pnpm run lint:check    # ESLint without fixing
pnpm run format:check  # Prettier formatting check

# Auto-fix issues
pnpm run fix-all       # Fix all auto-fixable issues
pnpm run lint          # ESLint with auto-fix
pnpm run format        # Format code with Prettier
```

### Build and Test

```bash
# Build for production
pnpm run build

# Start production server
pnpm start

# Environment verification
pnpm run verify:env
```

### Database Management

```bash
# Generate TypeScript types from Supabase
pnpm run supabase:types

# Start local Supabase (if using local development)
pnpm run supabase:start

# Stop local Supabase
pnpm run supabase:stop

# Reset local database
pnpm run supabase:reset

# Push migrations to remote
pnpm run db:migrate

# Run seed data
pnpm run db:seed
```

## Code Style and Standards

### ESLint Configuration

The project uses ESLint with the following rules:

- **Next.js**: Official Next.js ESLint config
- **TypeScript**: Strict TypeScript rules
- **React**: React best practices
- **Import Organization**: Automatic import sorting

### Prettier Configuration

Code formatting is handled by Prettier with:

- **Semi-colons**: Required
- **Single Quotes**: Preferred
- **Print Width**: 80 characters
- **Tab Width**: 2 spaces
- **Tailwind Plugin**: Automatic class sorting

### File Organization

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main application routes
│   └── api/               # API routes
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Form components
│   └── charts/           # Chart components
├── lib/                  # Utilities and configuration
│   ├── supabase/         # Supabase client setup
│   ├── validations/      # Zod schemas
│   └── utils/            # Helper functions
├── hooks/                # Custom React hooks
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
```

## Git Workflow

### Branch Naming

- `feature/task-description` - New features
- `fix/bug-description` - Bug fixes
- `chore/maintenance-task` - Maintenance tasks
- `docs/documentation-update` - Documentation updates

### Commit Messages

Follow conventional commits:

```bash
feat: add user authentication system
fix: resolve transaction calculation bug
chore: update dependencies
docs: improve API documentation
```

### Pull Request Process

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes and Commit**:
   ```bash
   git add .
   git commit -m "feat: implement new feature"
   ```

3. **Run Quality Checks**:
   ```bash
   pnpm run check-all
   ```

4. **Push and Create PR**:
   ```bash
   git push origin feature/new-feature
   # Create PR through GitHub interface
   ```

5. **PR Requirements**:
   - All CI checks must pass
   - Code review approval required
   - No merge conflicts
   - Updated documentation if needed

## CI/CD Pipeline

### GitHub Actions Workflows

#### Main CI Pipeline (`ci.yml`)

Runs on `main` and `develop` branches:

1. **Setup**: Install dependencies and cache
2. **Environment Verification**: Check required variables
3. **Lint**: ESLint and Prettier checks
4. **Type Check**: TypeScript compilation
5. **Build**: Production build
6. **Security Audit**: Dependency vulnerability scan
7. **Deploy**: Automatic deployment to Vercel (main branch only)

#### PR Checks (`pr-checks.yml`)

Runs on pull requests:

1. **Quick Validation**: Fast quality checks
2. **Breaking Changes**: Detect potential breaking changes
3. **PR Size**: Check for overly large PRs

### Deployment

Automatic deployment to Vercel:

- **Staging**: All pushes to `develop` branch
- **Production**: All pushes to `main` branch

Manual deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional Variables

```bash
# Application Configuration
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Validation

The `verify:env` script validates:

- Variable presence
- Format validation (URLs, JWT tokens)
- Node.js and pnpm versions
- Environment file existence

## Debugging

### Development Issues

1. **Environment Problems**:
   ```bash
   pnpm run verify:env
   ```

2. **Type Errors**:
   ```bash
   pnpm run type-check
   ```

3. **Linting Issues**:
   ```bash
   pnpm run lint
   ```

4. **Build Failures**:
   ```bash
   pnpm run build
   ```

### Common Issues

#### Supabase Connection

- Verify environment variables
- Check Supabase project status
- Ensure RLS policies are correct

#### TypeScript Errors

- Run `pnpm run supabase:types` to regenerate types
- Check import paths
- Verify component prop types

#### Build Errors

- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `pnpm install`
- Check for circular dependencies

## Performance Optimization

### Development

- Use React DevTools for component debugging
- Monitor bundle size with `@next/bundle-analyzer`
- Profile with Next.js built-in profiler

### Production

- Enable Vercel Analytics
- Monitor Core Web Vitals
- Use Lighthouse for performance audits

## Security

### Best Practices

- Never commit `.env.local` files
- Use environment variables for secrets
- Validate all user inputs with Zod
- Implement proper RLS policies
- Regular dependency audits with `pnpm audit`

### Security Headers

Configured in `vercel.json`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Troubleshooting

### Common Commands

```bash
# Reset everything
pnpm run clean && pnpm install

# Fix all code issues
pnpm run fix-all

# Verify environment
pnpm run verify:env

# Check all quality gates
pnpm run check-all
```

### Getting Help

1. Check this documentation
2. Review error messages carefully
3. Check GitHub Issues for similar problems
4. Consult Next.js and Supabase documentation
5. Create a new issue with detailed information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality checks
5. Submit a pull request
6. Respond to code review feedback

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Proper error handling
- [ ] Accessibility considerations
- [ ] Performance implications considered