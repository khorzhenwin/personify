# Vercel Frontend Deployment Guide

This guide provides step-by-step instructions for deploying the Personal Finance Tracker frontend to Vercel.

## Prerequisites

Before starting the deployment, ensure you have:

1. **Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Connect your GitHub account

2. **Backend Deployed**
   - Backend should be deployed to AWS ECS
   - Backend URL should be accessible (e.g., `http://1.2.3.4:8000`)

3. **GitHub Repository**
   - Code should be pushed to GitHub
   - Repository should be accessible to Vercel

## Quick Deployment

### Option 1: Automated Script Deployment

```bash
# Set your backend URL
export BACKEND_URL=http://your-backend-ip:8000

# Run the deployment script
./scripts/deploy-frontend-vercel.sh
```

### Option 2: Vercel CLI Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Deploy to Vercel
vercel --prod \
  --env NEXT_PUBLIC_API_URL=http://your-backend-ip:8000 \
  --env NODE_ENV=production \
  --env NEXT_PUBLIC_ENABLE_ANALYTICS=true \
  --env NEXT_PUBLIC_ENABLE_EXPORT=true
```

### Option 3: GitHub Integration (Recommended)

1. **Connect Repository to Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `frontend` directory as the root

2. **Configure Build Settings**
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=http://your-backend-ip:8000
   NODE_ENV=production
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   NEXT_PUBLIC_ENABLE_EXPORT=true
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Get your deployment URL

## Configuration Details

### Environment Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://1.2.3.4:8000` |
| `NODE_ENV` | Environment | `production` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics features | `true` |
| `NEXT_PUBLIC_ENABLE_EXPORT` | Enable data export | `true` |

### Build Configuration

The project includes optimized configuration for Vercel:

**next.config.ts:**
- Optimized package imports for Mantine UI
- Security headers configuration
- Performance optimizations

**vercel.json:**
- Build and output directory settings
- Function timeout configuration
- Header configuration for API routes
- Rewrite rules for API proxy

### Performance Optimizations

- **Static Generation**: Pages are statically generated where possible
- **Image Optimization**: Next.js Image component with Vercel optimization
- **Font Optimization**: Automatic font optimization
- **Bundle Analysis**: Optimized imports for smaller bundle size

## Testing Deployment

### Automated Testing

```bash
# Test the deployed frontend
export FRONTEND_URL=https://your-app.vercel.app
export BACKEND_URL=http://your-backend-ip:8000

# Run Vercel-specific tests
./scripts/test-vercel-deployment.sh

# Run comprehensive production tests
./scripts/test-production-e2e.sh
```

### Manual Testing Checklist

1. **Basic Functionality**
   - [ ] Homepage loads correctly
   - [ ] Login page is accessible
   - [ ] Registration page works
   - [ ] Navigation is functional

2. **Responsive Design**
   - [ ] Mobile view (375px width)
   - [ ] Tablet view (768px width)
   - [ ] Desktop view (1280px+ width)
   - [ ] Touch interactions work on mobile

3. **API Integration**
   - [ ] Login functionality works
   - [ ] Registration creates users
   - [ ] Protected routes redirect properly
   - [ ] API calls succeed

4. **Performance**
   - [ ] Initial page load < 3 seconds
   - [ ] Navigation is smooth
   - [ ] Images load properly
   - [ ] No console errors

### Responsive Design Testing

Run the comprehensive responsive design tests:

```bash
cd frontend
npm run test:e2e -- responsive-design.spec.ts
```

This will test:
- Multiple device sizes and orientations
- Touch interactions on mobile
- Keyboard navigation
- Accessibility features
- Layout consistency

## Backend CORS Configuration

Ensure your backend allows requests from your Vercel domain:

```python
# In your Django settings.py
CORS_ALLOWED_ORIGINS = [
    "https://your-app.vercel.app",
    "https://your-app-git-main-username.vercel.app",  # Preview deployments
    "http://localhost:3000",  # Development
]

# Or for development/testing (less secure)
CORS_ALLOW_ALL_ORIGINS = True
```

## Custom Domain Setup (Optional)

1. **Add Custom Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Backend CORS**
   - Add your custom domain to `CORS_ALLOWED_ORIGINS`
   - Redeploy backend with updated settings

3. **SSL Certificate**
   - Vercel automatically provides SSL certificates
   - No additional configuration needed

## Monitoring and Analytics

### Vercel Analytics

Enable Vercel Analytics for performance monitoring:

1. Go to Project Settings → Analytics
2. Enable Web Analytics
3. Add analytics script to your app (optional)

### Error Monitoring

Consider adding error monitoring:

```bash
# Install Sentry (optional)
npm install @sentry/nextjs

# Configure in next.config.js
```

## Deployment Environments

### Production Deployment

- **URL**: `https://your-app.vercel.app`
- **Branch**: `main` or `master`
- **Environment**: `production`
- **Auto-deploy**: Enabled on push to main branch

### Preview Deployments

- **URL**: `https://your-app-git-branch-username.vercel.app`
- **Branch**: Any branch except main
- **Environment**: `preview`
- **Auto-deploy**: Enabled on push to any branch

### Development

- **URL**: `http://localhost:3000`
- **Environment**: `development`
- **Command**: `npm run dev`

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs in Vercel dashboard
   # Common fixes:
   - Ensure all dependencies are in package.json
   - Check TypeScript errors
   - Verify environment variables
   ```

2. **API Connection Issues**
   ```bash
   # Check CORS configuration
   # Verify backend URL is accessible
   # Check environment variables
   ```

3. **Performance Issues**
   ```bash
   # Analyze bundle size
   npm run build
   
   # Check for large dependencies
   # Optimize images and assets
   ```

### Debug Commands

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs your-deployment-url

# Check environment variables
vercel env ls

# Test local build
cd frontend
npm run build
npm run start
```

## Security Considerations

### Environment Variables

- Never commit sensitive data to repository
- Use Vercel environment variables for secrets
- Separate development and production variables

### Content Security Policy

The app includes security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: origin-when-cross-origin

### HTTPS

- Vercel automatically provides HTTPS
- All production traffic is encrypted
- HTTP requests are redirected to HTTPS

## Cost Optimization

### Vercel Pricing

- **Hobby Plan**: Free for personal projects
  - 100GB bandwidth per month
  - Unlimited static sites
  - Serverless functions included

- **Pro Plan**: $20/month for teams
  - 1TB bandwidth per month
  - Advanced analytics
  - Team collaboration features

### Optimization Tips

1. **Static Generation**: Use static generation where possible
2. **Image Optimization**: Use Next.js Image component
3. **Bundle Size**: Monitor and optimize bundle size
4. **Caching**: Leverage Vercel's edge caching

## Maintenance

### Updates

```bash
# Update dependencies
cd frontend
npm update

# Test updates
npm run test
npm run build

# Deploy updates
git push origin main  # Auto-deploys to Vercel
```

### Monitoring

- Check Vercel dashboard regularly
- Monitor performance metrics
- Review error logs
- Update dependencies monthly

## Support

### Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### Getting Help

1. Check Vercel dashboard for error messages
2. Review build and function logs
3. Test locally with `npm run build && npm run start`
4. Check GitHub issues for similar problems

## Next Steps

After successful deployment:

1. **Test Complete Application**
   - Run end-to-end tests
   - Verify all features work in production
   - Test on multiple devices

2. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Set up error monitoring
   - Configure alerts

3. **Optimize Performance**
   - Analyze Core Web Vitals
   - Optimize images and assets
   - Monitor bundle size

4. **Documentation**
   - Update README with deployment URLs
   - Document any custom configuration
   - Create user guides

Your Personal Finance Tracker frontend is now deployed on Vercel! 🎉

## Deployment URLs

After successful deployment, you'll have:

- **Production**: `https://your-app.vercel.app`
- **Preview**: `https://your-app-git-branch-username.vercel.app`
- **Backend**: `http://your-backend-ip:8000`

The application is now ready for production use with full responsive design support across all devices!