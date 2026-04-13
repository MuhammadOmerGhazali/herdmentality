# Deploy to Vercel via GitHub - Step by Step

## Step 1: Push Your Code to GitHub

### If you don't have a GitHub repository yet:

1. **Go to GitHub** and create a new repository:
   - Visit https://github.com/new
   - Repository name: `sheep-market` (or your preferred name)
   - Description: "Sheep Market - Prediction Trading Game"
   - Choose Public or Private
   - **DO NOT** initialize with README (you already have files)
   - Click "Create repository"

2. **In your terminal, run these commands:**

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - ready for Vercel deployment"

# Add your GitHub repository as remote
# Replace YOUR_USERNAME and YOUR_REPO with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### If you already have a GitHub repository:

```bash
# Make sure all changes are committed
git add .
git commit -m "Add Vercel deployment configuration"
git push
```

## Step 2: Deploy on Vercel

1. **Go to Vercel**:
   - Visit https://vercel.com
   - Click "Sign Up" or "Log In"
   - Choose "Continue with GitHub"

2. **Import Your Project**:
   - Click "Add New..." → "Project"
   - You'll see your GitHub repositories
   - Find "sheep-market" (or your repo name)
   - Click "Import"

3. **Configure Project Settings**:
   
   **Project Name**: `sheep-market` (or customize)
   
   **Framework Preset**: Select "Other"
   
   **Root Directory**: `.` (leave as is)
   
   **Build Settings**:
   - Build Command: Leave empty or use `npm run build`
   - Output Directory: `.` (leave as is)
   - Install Command: Leave empty (no dependencies needed for deployment)
   
   **Environment Variables**: None needed (skip this)

4. **Deploy**:
   - Click "Deploy"
   - Wait 30-60 seconds for deployment to complete
   - You'll see a success screen with confetti! 🎉

## Step 3: Access Your Game

After deployment completes:

1. **Your game URL** will be shown:
   - Format: `https://sheep-market-xxxxx.vercel.app`
   - Click "Visit" to open your game

2. **Share the URL**:
   - Copy the URL and share it with players
   - The game is now live and accessible worldwide!

## Step 4: Set Up Automatic Deployments

Good news - this is already done! 🎉

Every time you push to GitHub:
- Vercel automatically deploys your changes
- You get a preview URL for each commit
- Production updates when you push to `main` branch

## Step 5: (Optional) Add Custom Domain

If you have a custom domain:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `sheepmarket.com`)
4. Follow the DNS configuration instructions
5. Wait for DNS propagation (5-30 minutes)

## Troubleshooting

### Issue: Can't find repository on Vercel
**Solution**: 
- Make sure you pushed to GitHub first
- Check that you authorized Vercel to access your GitHub account
- Try refreshing the import page

### Issue: Deployment fails
**Solution**:
- Check the build logs in Vercel dashboard
- Make sure all files are committed and pushed
- Verify `vercel.json` is in your repository

### Issue: Game doesn't load
**Solution**:
- Check browser console for errors (F12)
- Verify all asset paths are relative
- Check that `index.html` is in the root directory

### Issue: Assets not loading (404 errors)
**Solution**:
- Make sure `assets/` folder is committed to git
- Check that asset paths in code are correct
- Verify `.vercelignore` isn't excluding assets

## Making Updates

To update your deployed game:

```bash
# Make your changes to the code
# ...

# Commit and push
git add .
git commit -m "Description of your changes"
git push

# Vercel automatically deploys!
# Check your Vercel dashboard to see deployment progress
```

## Vercel Dashboard Features

Access at: https://vercel.com/dashboard

- **Deployments**: See all deployments and their status
- **Analytics**: View traffic and performance (if enabled)
- **Logs**: Check runtime logs and errors
- **Settings**: Configure domains, environment variables, etc.
- **Preview Deployments**: Test changes before going live

## Performance Monitoring

After deployment, monitor:

1. **Vercel Analytics** (optional, paid feature):
   - Real user monitoring
   - Core Web Vitals
   - Traffic analytics

2. **Browser DevTools** (free):
   - Open game in browser
   - Press F12
   - Check Console for errors
   - Check Network tab for loading times
   - Check Performance tab for FPS

## Cost

**Hobby Plan (Free)**:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Perfect for your game!

**Pro Plan ($20/month)** - Only if you need:
- More bandwidth
- Team collaboration
- Advanced analytics
- Password protection

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test the game on the live URL
3. ✅ Share with friends/testers
4. 📊 Monitor performance
5. 🎮 Gather feedback
6. 🔄 Make improvements and push updates

---

## Quick Reference

```bash
# Push updates
git add .
git commit -m "Your update message"
git push

# Check deployment status
# Visit: https://vercel.com/dashboard

# View your live game
# Visit: https://your-project.vercel.app
```

---

**You're all set!** Follow the steps above and your game will be live in minutes! 🚀
