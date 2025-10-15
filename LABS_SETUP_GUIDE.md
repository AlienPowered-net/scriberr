# 🧪 Labs Environment Setup Guide

## ✅ Completed Steps

The following automated steps have been completed:

1. ✅ **GitHub Branch Created**: The `labs` branch has been created and pushed to GitHub
2. ✅ **Configuration Files**: 
   - `shopify.app.labs.toml` - Shopify app configuration (needs Client ID)
   - `.env.labs` - Local environment variables (needs credentials)
   - `README.md` - Updated with labs documentation

---

## 🔧 Manual Steps Required

You now need to complete these manual steps to finish the setup:

### Step 2: Create NeonDB Branch

**Go to**: https://console.neon.tech

1. Select your Scriberr database project
2. Click **"Branches"** in the left sidebar
3. Click **"Create Branch"**
4. Configure:
   - **Branch from**: `main` (your production branch)
   - **Branch name**: `labs`
   - **Compute**: Use default or smaller size for cost savings
5. Click **"Create Branch"**
6. **Copy the connection string** - it will look like:
   ```
   postgresql://neondb_owner:xxx@ep-xxx-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
7. Save this for the next steps

**Note**: The labs branch starts as a copy of your production data but will diverge independently.

---

### Step 3: Create Shopify App "Scriberr Labs"

**Go to**: https://partners.shopify.com

1. Navigate to **"Apps"** → **"Create app"**
2. Select **"Create app manually"**
3. Fill in the details:

**Basic Information:**
- **App name**: `Scriberr Labs`
- **App URL**: `https://scriberr-git-labs-alienpowered.vercel.app`

**Allowed redirection URLs** (add all three):
```
https://scriberr-git-labs-alienpowered.vercel.app/auth/callback
https://scriberr-git-labs-alienpowered.vercel.app/auth/shopify/callback
https://scriberr-git-labs-alienpowered.vercel.app/api/auth/callback
```

4. After creation, go to **"Configuration"**:
   - Enable **"Embedded app"**: Yes
   - Confirm **App URL** is correct

5. Go to **"API credentials"**:
   - Copy the **Client ID** (e.g., `abc123def456...`)
   - Click **"Reveal"** and copy the **Client secret**
   - **Save both** - you'll need them next

6. Set up **API scopes** under "Configuration" → "API access":
   ```
   read_products
   read_orders
   read_customers
   read_discounts
   read_draft_orders
   ```

7. (Optional) Configure **Webhooks**:
   - API version: `2025-07`
   - Add subscriptions:
     - `app/uninstalled` → `/webhooks/app/uninstalled`
     - `app/scopes_update` → `/webhooks/app/scopes_update`

---

### Step 4: Update Configuration Files with Credentials

Now that you have the credentials, update the configuration files:

#### 4A. Update `shopify.app.labs.toml`

Open the file and replace:
```toml
client_id = "REPLACE_WITH_CLIENT_ID_FROM_SHOPIFY"
```

With your actual Client ID:
```toml
client_id = "your_actual_client_id_here"
```

#### 4B. Update `.env.labs`

Open the file and replace all placeholders:

```env
DATABASE_URL=<paste your NeonDB labs connection string>
SHOPIFY_API_KEY=<paste your Client ID>
SHOPIFY_API_SECRET=<paste your Client Secret>
SHOPIFY_API_SECRET_KEY=<paste your Client Secret>
SCOPES=read_products,read_orders,read_customers,read_discounts,read_draft_orders
SHOPIFY_APP_URL=https://scriberr-git-labs-alienpowered.vercel.app
APP_URL=https://scriberr-git-labs-alienpowered.vercel.app
NODE_ENV=development
```

#### 4C. Commit the Updated Config

After updating `shopify.app.labs.toml`:

```bash
git add shopify.app.labs.toml
git commit -m "Update labs Shopify app client ID"
git push origin labs
```

**Do NOT commit `.env.labs`** - it's already in `.gitignore`

---

### Step 5: Configure Vercel Environment Variables

**Go to**: https://vercel.com/dashboard

1. Select your **Scriberr project**
2. Go to **"Settings"** → **"Environment Variables"**
3. For each variable below, click **"Add New"**
4. Set **Environment** to **"Preview"** and filter to branch `labs`

**Add these environment variables:**

| Variable Name | Value | Branch |
|--------------|-------|--------|
| `DATABASE_URL` | `<NeonDB labs connection string>` | Preview (labs) |
| `SHOPIFY_API_KEY` | `<Client ID>` | Preview (labs) |
| `SHOPIFY_API_SECRET` | `<Client Secret>` | Preview (labs) |
| `SHOPIFY_API_SECRET_KEY` | `<Client Secret>` | Preview (labs) |
| `SCOPES` | `read_products,read_orders,read_customers,read_discounts,read_draft_orders` | Preview (labs) |
| `SHOPIFY_APP_URL` | `https://scriberr-git-labs-alienpowered.vercel.app` | Preview (labs) |
| `APP_URL` | `https://scriberr-git-labs-alienpowered.vercel.app` | Preview (labs) |
| `NODE_ENV` | `development` | Preview (labs) |

5. Go to **"Settings"** → **"Git"**
6. Verify **"Automatically deploy preview branches"** is enabled

---

### Step 6: Trigger Vercel Deployment

Once environment variables are set, trigger a deployment:

**Option A**: Push a small change:
```bash
git commit --allow-empty -m "Trigger labs deployment"
git push origin labs
```

**Option B**: In Vercel dashboard:
- Go to the **Deployments** tab
- Find the labs branch
- Click **"Redeploy"**

Watch the deployment logs for:
- ✅ Build success
- ✅ Database connection successful
- ✅ Prisma migrations applied
- ✅ No environment variable errors

---

### Step 7: Test Local Development

Test the labs environment on your local machine:

```bash
# Switch to labs branch
git checkout labs
git pull origin labs

# Copy labs environment variables
cp .env.labs env

# Install dependencies (if needed)
npm install

# Generate Prisma client
npx prisma generate

# Run migrations on labs database
npx prisma migrate deploy

# Initialize database
node scripts/init-database.js

# Start development server
npm run dev
```

When Shopify CLI prompts, select **"Scriberr Labs"** as the app.

Or manually link it:
```bash
npm run config:use
# Select "Scriberr Labs" from the list
```

---

### Step 8: Test on Development Store

1. Go to your Shopify Partners dashboard
2. Create or use an existing **development store**
3. Install the **"Scriberr Labs"** app
4. Test the following:
   - ✅ App installs successfully
   - ✅ App loads in Shopify admin
   - ✅ Can create folders
   - ✅ Can create notes
   - ✅ Autosave works
   - ✅ Data persists (check NeonDB labs branch)

---

### Step 9: Verify Live Deployment

Once Vercel deploys successfully:

1. Visit: https://scriberr-git-labs-alienpowered.vercel.app
2. The URL should show your app (may redirect to Shopify auth)
3. Install on a development store using this URL
4. Verify all features work in the deployed environment

---

## 📋 Post-Setup Validation Checklist

- [ ] NeonDB labs branch created and connection string works
- [ ] Shopify app "Scriberr Labs" created with correct credentials
- [ ] `shopify.app.labs.toml` updated with actual Client ID
- [ ] `.env.labs` updated with all credentials locally
- [ ] Vercel environment variables configured for labs branch
- [ ] Vercel auto-deploys labs branch successfully
- [ ] Local development works with labs environment
- [ ] App installs on development store successfully
- [ ] Live deployment accessible and functional
- [ ] Database operations work (create folder, note, etc.)

---

## 🚀 Using the Labs Environment

### Development Workflow

1. **Create feature branch from labs:**
   ```bash
   git checkout labs
   git pull origin labs
   git checkout -b feature-name
   ```

2. **Develop and test locally:**
   ```bash
   cp .env.labs env
   npm run dev
   ```

3. **Push and create PR to labs:**
   ```bash
   git push origin feature-name
   # Create PR targeting labs branch
   ```

4. **Merge to labs for team testing**
   - Once merged, Vercel auto-deploys
   - Test on https://scriberr-git-labs-alienpowered.vercel.app

5. **When stable, merge labs → main:**
   ```bash
   git checkout main
   git pull origin main
   git merge labs
   git push origin main
   ```

### Environment Hierarchy

```
main (production)
  ↑ merge when stable
labs (pre-production) ← https://scriberr-git-labs-alienpowered.vercel.app
  ↑ merge after testing
feature branches (development) ← temporary preview URLs
```

---

## 🔍 Troubleshooting

### Vercel deployment fails with database error
- Verify `DATABASE_URL` in Vercel environment variables
- Check NeonDB console that labs branch is active
- Review Vercel build logs for Prisma errors

### Shopify app won't install
- Verify redirect URLs match exactly in Partner Dashboard
- Check `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` in Vercel
- Ensure all URLs use HTTPS

### Local dev can't connect
- Run `npm run config:use` and select "Scriberr Labs"
- Verify `.env.labs` values copied to `env` file
- Check Shopify CLI is using correct app configuration

### Database schema mismatch
- Run: `npx prisma migrate deploy`
- If needed: `npx prisma migrate reset` (only in labs!)

---

## 📞 Next Steps

After completing all manual steps:

1. **Test a feature**: Create a test branch from labs to verify the full workflow
2. **Monitor Vercel**: Check deployment logs and ensure auto-deploy works
3. **Check NeonDB**: Monitor database usage and costs for the labs branch
4. **Team onboarding**: Share this guide with team members
5. **Sync regularly**: Periodically merge main → labs to keep in sync

---

## 📝 Quick Reference

**Vercel URL**: https://scriberr-git-labs-alienpowered.vercel.app
**NeonDB Console**: https://console.neon.tech
**Shopify Partners**: https://partners.shopify.com
**GitHub Repo**: https://github.com/AlienPowered-net/scriberr
**Labs Branch**: https://github.com/AlienPowered-net/scriberr/tree/labs

---

**Questions or issues?** Refer to the full plan in `labs-environment-setup.plan.md`

