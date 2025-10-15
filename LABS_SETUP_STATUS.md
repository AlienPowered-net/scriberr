# 🧪 Labs Environment Setup - Current Status

**Last Updated**: Initial Setup Complete  
**Branch**: `labs`  
**Repository**: https://github.com/AlienPowered-net/scriberr

---

## ✅ Automated Setup Complete

The following steps have been completed automatically:

### 1. GitHub Branch ✅
- **Status**: Complete
- **Branch**: `labs` created and pushed to GitHub
- **URL**: https://github.com/AlienPowered-net/scriberr/tree/labs

### 2. Configuration Files ✅
All configuration files have been created:

- ✅ **`shopify.app.labs.toml`** - Shopify app configuration
  - Location: Root directory
  - Status: Created with placeholder for Client ID
  - Action needed: Update with actual Client ID after creating Shopify app

- ✅ **`.env.labs`** - Local environment variables
  - Location: Root directory (gitignored)
  - Status: Created with placeholders
  - Action needed: Update with actual credentials from NeonDB and Shopify

- ✅ **`README.md`** - Documentation
  - Status: Updated with labs environment instructions
  - Includes: Setup details, local dev workflow, deployment instructions

- ✅ **`LABS_SETUP_GUIDE.md`** - Comprehensive setup guide
  - Status: Created with step-by-step manual instructions
  - Includes: All manual steps, troubleshooting, workflows

### 3. Git Commits ✅
All changes have been committed and pushed:
```
86c3b5c - Add labs environment configuration and documentation
0ff12be - Add comprehensive labs environment setup guide
```

---

## 🔄 Manual Steps Required

You now need to complete these external configuration steps:

### Step 1: Create NeonDB Branch
**Status**: ⏳ Pending  
**Required**: Yes  
**Platform**: NeonDB Console

**Instructions**:
1. Go to https://console.neon.tech
2. Create a new branch named `labs` from your main database
3. Copy the connection string
4. Save for use in `.env.labs` and Vercel

**Documentation**: See `LABS_SETUP_GUIDE.md` - Step 2

---

### Step 2: Create Shopify App
**Status**: ⏳ Pending  
**Required**: Yes  
**Platform**: Shopify Partner Dashboard

**Instructions**:
1. Go to https://partners.shopify.com
2. Create new app: "Scriberr Labs"
3. Configure URLs: `https://scriberr-git-labs-alienpowered.vercel.app`
4. Set up redirect URLs (3 total)
5. Configure API scopes
6. Copy Client ID and Client Secret

**Documentation**: See `LABS_SETUP_GUIDE.md` - Step 3

---

### Step 3: Update Configuration Files
**Status**: ⏳ Pending  
**Depends on**: Steps 1 & 2  
**Required**: Yes

**Files to update**:

**A. `shopify.app.labs.toml`**
```toml
# Replace this line:
client_id = "REPLACE_WITH_CLIENT_ID_FROM_SHOPIFY"

# With:
client_id = "your_actual_client_id"
```

Then commit and push:
```bash
git add shopify.app.labs.toml
git commit -m "Update labs Shopify app client ID"
git push origin labs
```

**B. `.env.labs`** (local only, do not commit)
Update all placeholder values with actual credentials from NeonDB and Shopify.

**Documentation**: See `LABS_SETUP_GUIDE.md` - Step 4

---

### Step 4: Configure Vercel Environment Variables
**Status**: ⏳ Pending  
**Depends on**: Steps 1 & 2  
**Required**: Yes  
**Platform**: Vercel Dashboard

**Instructions**:
1. Go to https://vercel.com/dashboard
2. Select Scriberr project
3. Go to Settings → Environment Variables
4. Add 8 environment variables for Preview (labs branch):
   - `DATABASE_URL`
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SHOPIFY_API_SECRET_KEY`
   - `SCOPES`
   - `SHOPIFY_APP_URL`
   - `APP_URL`
   - `NODE_ENV`

**Documentation**: See `LABS_SETUP_GUIDE.md` - Step 5

---

### Step 5: Trigger Vercel Deployment
**Status**: ⏳ Pending  
**Depends on**: Steps 1-4  
**Required**: Yes  
**Platform**: Vercel Dashboard

**Instructions**:
Either push a change or manually redeploy in Vercel dashboard.

```bash
git commit --allow-empty -m "Trigger labs deployment"
git push origin labs
```

**Expected URL**: https://scriberr-git-labs-alienpowered.vercel.app

**Documentation**: See `LABS_SETUP_GUIDE.md` - Step 6

---

### Step 6: Test Local Development
**Status**: ⏳ Pending  
**Depends on**: Steps 1-3  
**Optional**: Recommended

**Instructions**:
```bash
git checkout labs
cp .env.labs env
npm run dev
```

Select "Scriberr Labs" when prompted by Shopify CLI.

**Documentation**: See `LABS_SETUP_GUIDE.md` - Step 7

---

### Step 7: Test on Development Store
**Status**: ⏳ Pending  
**Depends on**: Steps 1-5  
**Optional**: Recommended

Install the Scriberr Labs app on a Shopify development store and test functionality.

**Documentation**: See `LABS_SETUP_GUIDE.md` - Step 8

---

## 📝 Quick Setup Checklist

Use this checklist as you complete the manual steps:

- [ ] Create NeonDB labs branch
- [ ] Copy NeonDB labs connection string
- [ ] Create Shopify app "Scriberr Labs"
- [ ] Copy Shopify Client ID
- [ ] Copy Shopify Client Secret
- [ ] Update `shopify.app.labs.toml` with Client ID
- [ ] Commit and push updated config
- [ ] Update `.env.labs` locally with all credentials
- [ ] Configure Vercel environment variables for labs branch
- [ ] Trigger Vercel deployment
- [ ] Verify deployment successful
- [ ] Test local development
- [ ] Install on development store
- [ ] Verify all features work

---

## 📚 Documentation Files

All documentation is available in the repository:

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation with labs section |
| `LABS_SETUP_GUIDE.md` | Comprehensive step-by-step manual setup guide |
| `LABS_SETUP_STATUS.md` | This file - current status and next steps |
| `labs-environment-setup.plan.md` | Original detailed implementation plan |
| `shopify.app.labs.toml` | Shopify app configuration for labs |
| `.env.labs` | Local environment variables template (gitignored) |

---

## 🎯 Next Actions

**Immediate next steps** (in order):

1. **Open NeonDB Console** → Create labs branch → Copy connection string
2. **Open Shopify Partner Dashboard** → Create Scriberr Labs app → Copy credentials
3. **Update files** → `shopify.app.labs.toml` and `.env.labs`
4. **Commit and push** → Updated shopify config to labs branch
5. **Configure Vercel** → Add environment variables for labs branch
6. **Deploy** → Trigger Vercel deployment
7. **Test** → Local development and live deployment

---

## 🚀 After Setup Complete

Once all manual steps are done:

1. **Test the workflow**: Create a test feature branch from labs
2. **Verify auto-deploy**: Push to labs and confirm Vercel deploys
3. **Monitor resources**: Check NeonDB usage and Vercel deployment logs
4. **Team onboarding**: Share documentation with team members
5. **Start developing**: Begin using labs for feature development

---

## 📞 Support

- **Full Guide**: See `LABS_SETUP_GUIDE.md` for detailed instructions
- **Original Plan**: See `labs-environment-setup.plan.md` for complete plan
- **Troubleshooting**: Included in `LABS_SETUP_GUIDE.md`

---

**Ready to continue?** Open `LABS_SETUP_GUIDE.md` and follow the manual steps starting with "Step 2: Create NeonDB Branch"

