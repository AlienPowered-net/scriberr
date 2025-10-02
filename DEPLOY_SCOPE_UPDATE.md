# How to Deploy read_users Scope Update

## The Issue
The scope is in `shopify.app.toml` but hasn't been deployed to Shopify's servers yet. For production apps, you must deploy configuration changes via Shopify CLI.

---

## ✅ **Solution: Deploy via Shopify CLI**

### **Run This From Your Local Machine:**

1. **Clone/Pull the latest code:**
   ```bash
   git pull origin main
   ```

2. **Install Shopify CLI** (if not already installed):
   ```bash
   npm install -g @shopify/cli @shopify/app
   ```

3. **Deploy the app configuration:**
   ```bash
   npm run deploy
   # OR
   shopify app deploy
   ```

4. **What happens during deploy:**
   - Shopify CLI reads `shopify.app.toml`
   - Detects scope change: `write_products` → `write_products,read_users`
   - Uploads the new configuration to Shopify
   - Creates a new app version

5. **After deployment:**
   - Existing installations will see a prompt to approve new scopes
   - OR merchants need to reinstall the app
   - The scope update takes effect

---

## 🔄 **Alternative: Use Development Mode (Easiest for Testing)**

Instead of deploying, you can test in development mode where scopes work immediately:

### **Run From Your Local Machine:**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Shopify CLI will:**
   - Read `shopify.app.toml` (which already has `read_users`)
   - Create a tunnel to your local app
   - Request the updated scopes
   - Prompt you to approve on your test store

3. **Approve the scopes:**
   - Open the provided URL
   - You'll see: "This app needs permission to: Read users and staff"
   - Click "Install" or "Approve"

4. **Test immediately:**
   - Visit `/app/debug-mentions`
   - You should see `read_users` in the scopes
   - Add staff in Shopify Admin
   - They'll appear in the mentions list!

---

## 💡 **Why This Happens:**

**For Vercel/Production Apps:**
- Vercel deploys your **code** (the app functionality)
- Shopify Partners stores your **configuration** (scopes, webhooks, etc.)
- Configuration must be deployed via Shopify CLI with `shopify app deploy`
- Just pushing to git/Vercel doesn't update Shopify's configuration

**For Development (`npm run dev`):**
- Shopify CLI reads `shopify.app.toml` directly
- Scopes work immediately
- No separate deploy needed

---

## 🚀 **Quick Test: Use Custom Mentions Now!**

While you set up the Shopify CLI deployment, you can use Custom Mentions immediately:

### **No Scope Changes Needed:**

1. Go to **Settings → Custom Mentions** in your deployed app
2. Click **"Add Person"**
3. Add test users:
   ```
   Name: John Smith
   Email: john@test.com
   
   Name: Sarah Johnson  
   Email: sarah@test.com
   
   Name: Mike Wilson
   Email: mike@test.com
   ```

4. **Go to Dashboard → Create/Edit a note**
5. **Type `@`**
6. ✅ **You'll see all your custom mentions immediately!**

**This works perfectly without any scope changes!**

---

## 📝 **Summary:**

### **For Testing Staff Members:**
- Run `npm run dev` locally
- Scopes will work in dev mode
- Add Shopify staff
- Test @ mentions

### **For Production Deployment:**
- Run `shopify app deploy` from your machine
- Pushes config to Shopify
- Users see scope approval prompt

### **For Immediate Use:**
- Use **Custom Mentions** in Settings
- Works perfectly on deployed app
- No CLI deployment needed
- More flexible than Shopify staff!

---

## 🎯 **My Recommendation:**

**Use Custom Mentions for now!** It's actually better because:
- ✅ Works immediately on production
- ✅ No scope deployment hassle
- ✅ Can add anyone (not just Shopify staff)
- ✅ You control the list completely
- ✅ Perfect for mentioning: clients, suppliers, team members, etc.

The Shopify staff integration is a bonus feature, but Custom Mentions is the more practical solution! 🚀
