# Vercel Deployment Guide

## Quick Deploy

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts
   - Choose your project name
   - Accept defaults for most questions

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/new
   - Click "Import Project"
   - Select your GitHub repository

3. **Configure Project**:
   - Framework Preset: **Other**
   - Root Directory: **.**
   - Build Command: Leave empty or use `npm run build`
   - Output Directory: **.**
   - Install Command: `npm install` (optional, can leave empty)

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

## Project Configuration

### Files Added for Vercel

1. **vercel.json** - Vercel configuration
   - Configures static site deployment
   - Sets up CORS headers for Phaser/Tone.js
   - Routes all requests properly

2. **.vercelignore** - Files to exclude from deployment
   - Excludes node_modules, tests, docs
   - Keeps deployment size small

3. **package.json** - Added build script
   - `npm run build` for Vercel compatibility

## Environment Variables (if needed)

If you need to add environment variables:

1. **Via Vercel Dashboard**:
   - Go to Project Settings → Environment Variables
   - Add your variables

2. **Via CLI**:
   ```bash
   vercel env add VARIABLE_NAME
   ```

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Deployment URLs

After deployment, you'll get:
- **Production URL**: `your-project.vercel.app`
- **Preview URLs**: Automatic for each git push
- **Custom Domain**: If configured

## Troubleshooting

### Issue: Assets not loading
**Solution**: Check that all asset paths are relative (not absolute)

### Issue: CORS errors
**Solution**: The `vercel.json` headers should fix this. If not, check browser console for specific errors.

### Issue: 404 on routes
**Solution**: The routing in `vercel.json` handles this. Make sure it's deployed correctly.

### Issue: Build fails
**Solution**: Since this is a static site, there's no build step. Check that `package.json` has the build script.

## Performance Optimizations

Your game already has:
- ✅ ES modules via CDN (Phaser, Tone.js, React)
- ✅ Optimized particle systems
- ✅ Throttled update loops
- ✅ Asset preloading

Vercel will automatically:
- ✅ Serve via global CDN
- ✅ Enable HTTP/2
- ✅ Compress assets
- ✅ Cache static files

## Monitoring

After deployment:
1. Check Vercel Analytics (if enabled)
2. Monitor performance in browser DevTools
3. Check error logs in Vercel Dashboard

## Continuous Deployment

If using GitHub:
- Every push to `main` → Production deployment
- Every PR → Preview deployment
- Automatic rollbacks available

## Local Testing Before Deploy

```bash
# Test locally
npm start

# Or use Vercel dev server
vercel dev
```

## Cost

- **Hobby Plan**: Free
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Perfect for this game

- **Pro Plan**: $20/month (if you need more)

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Community: https://github.com/vercel/vercel/discussions

## Next Steps After Deployment

1. Test the game thoroughly on the live URL
2. Share the URL with players
3. Monitor performance and errors
4. Set up custom domain (optional)
5. Enable Vercel Analytics (optional)

## Quick Commands Reference

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel rm PROJECT_NAME
```

---

**Your game is ready to deploy!** Just run `vercel` in your project directory.
