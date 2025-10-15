# 📓 Scriberr – Shopify Notepad App

Scriberr is a Shopify app that allows merchants to keep organized notes inside their Shopify admin.  
It features folders, note management, and autosave so you never lose your work.

---

## ✨ Features
- 🗂 **Folders** – organize notes into folders (categories).  
- 📝 **Notes** – create, edit, delete, and move notes between folders.  
- 💾 **Autosave** – notes automatically save every 30 seconds.  
- 🎨 **Clean UI** – simple, minimal design inspired by productivity tools.  
- 🔗 **Shopify Embedded App** – runs directly inside the Shopify Admin.

---

## 🧪 Labs Development Environment

Scriberr has a dedicated **labs** environment for testing new features safely before production.

### Environment Details
- **Branch**: `labs`
- **URL**: https://scriberr-git-labs-alienpowered.vercel.app
- **Shopify App**: Scriberr Labs (separate app from production)
- **Database**: NeonDB `labs` branch (isolated from production)

### Local Development on Labs Branch

1. **Switch to labs branch:**
   ```bash
   git checkout labs
   git pull origin labs
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.labs env
   ```

3. **Run the app locally:**
   ```bash
   npm install
   npm run dev
   ```

4. **Testing with Shopify CLI:**
   ```bash
   # Use the labs Shopify app configuration
   npm run config:use
   # Select "Scriberr Labs" when prompted
   ```

### Deploying to Labs
- Push to the `labs` branch to trigger automatic Vercel deployment:
  ```bash
  git push origin labs
  ```

### Merging Labs → Main
Once features are tested in labs:
```bash
git checkout main
git merge labs
git push origin main
```

---

# Restored to commit 3c87c61 - Thu Sep 18 04:48:01 PM UTC 2025
