# BudgetUp Deployment Guide

This guide covers deploying BudgetUp to Vercel with automatic CI/CD.

## Prerequisites

- [Vercel account](https://vercel.com)
- [Supabase project](https://supabase.com)
- GitHub repository with the BudgetUp code

## Environment Variables

### Required Variables

Set these in your Vercel project settings:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### GitHub Secrets (for CI/CD)

Add these secrets to your GitHub repository:

```bash
# Vercel Integration
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

## Deployment Steps

### 1. Manual Deployment (First Time)

1. **Install Vercel CLI**:

   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy from project root**:

   ```bash
   cd budgetup
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new one
   - Set up environment variables
   - Deploy

### 2. Automatic Deployment Setup

1. **Connect GitHub Repository**:
   - Go to Vercel dashboard
   - Import your GitHub repository
   - Configure build settings (should auto-detect Next.js)

2. **Configure Environment Variables**:
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add all required variables from `.env.example`

3. **Set up GitHub Secrets**:

   ```bash
   # Get Vercel token from: https://vercel.com/account/tokens
   gh secret set VERCEL_TOKEN

   # Get org ID and project ID from Vercel CLI:
   vercel link
   cat .vercel/project.json

   gh secret set VERCEL_ORG_ID
   gh secret set VERCEL_PROJECT_ID
   ```

### 3. Supabase Configuration

1. **Database Setup**:

   ```bash
   # Run migrations
   supabase db push

   # Seed initial data
   supabase seed run
   ```

2. **RLS Policies**:
   - Ensure all RLS policies are applied
   - Test with different user roles

3. **Storage Configuration**:
   - Set up storage buckets for file uploads
   - Configure storage policies

## Build Configuration

The project uses these build settings:

- **Framework**: Next.js
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Output Directory**: `.next`
- **Node Version**: 18.x

## Environment-Specific Settings

### Development

```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Monitoring and Maintenance

### Health Checks

The app includes health check endpoints:

- `/health` - Basic health check
- `/api/health` - API health with database status

### Performance Monitoring

- Vercel Analytics (built-in)
- Core Web Vitals tracking
- Error boundary reporting

### Database Monitoring

- Supabase dashboard for query performance
- Connection pool monitoring
- RLS policy performance

## Troubleshooting

### Common Issues

1. **Build Failures**:

   ```bash
   # Check environment variables
   pnpm run verify:env

   # Run type checking
   pnpm run type-check

   # Check linting
   pnpm run lint:check
   ```

2. **Database Connection Issues**:
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure database is accessible

3. **Environment Variable Issues**:
   - Use `NEXT_PUBLIC_` prefix for client-side variables
   - Restart Vercel deployment after changes
   - Check variable names match exactly

### Debugging

1. **Local Development**:

   ```bash
   # Run all checks
   pnpm run check-all

   # Start development server
   pnpm dev
   ```

2. **Production Debugging**:
   - Check Vercel function logs
   - Monitor Supabase logs
   - Use browser dev tools for client issues

## Security Considerations

### Headers

The app includes security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Environment Variables

- Never commit `.env.local` to version control
- Use Vercel's environment variable encryption
- Rotate keys regularly

### Database Security

- RLS policies enforce data isolation
- Service role key only used server-side
- Regular security audits with `pnpm audit`

## Rollback Procedure

If deployment fails:

1. **Immediate Rollback**:

   ```bash
   # Via Vercel CLI
   vercel rollback

   # Or via dashboard
   # Go to Deployments → Select previous version → Promote
   ```

2. **Database Rollback** (if needed):

   ```bash
   # Reset to previous migration
   supabase db reset

   # Apply specific migration
   supabase migration up --to 20231201000000
   ```

## Performance Optimization

### Build Optimization

- Tree shaking enabled
- Bundle analysis with `@next/bundle-analyzer`
- Image optimization with Next.js Image component

### Runtime Optimization

- React Query for efficient data fetching
- Lazy loading for heavy components
- Service worker for offline functionality

### Database Optimization

- Proper indexing on frequently queried columns
- Connection pooling via Supabase
- Query optimization with EXPLAIN ANALYZE

## Maintenance Schedule

### Weekly

- Check Vercel deployment logs
- Monitor Supabase usage metrics
- Review security audit results

### Monthly

- Update dependencies
- Review and rotate API keys
- Performance audit and optimization

### Quarterly

- Full security review
- Database maintenance and optimization
- Disaster recovery testing
