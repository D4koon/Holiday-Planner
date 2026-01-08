# Fixing PR Preview 404 Errors

## Problem
The gh-pages branch was missing the main site content at its root, causing 404 errors when accessing:
- The main Holiday Planner site: `https://d4koon.github.io/Holiday-Planner/`
- Closed PR preview URLs (which redirect to the main site)

When PRs are closed, their preview directories are replaced with redirect pages that send users to the main site, but the main site itself wasn't being deployed.

## Solution
Two workflows have been configured:

### 1. Deploy Main Site (`deploy-main-site.yml`)
- Automatically deploys the main branch content to the root of gh-pages
- Runs on every push to main branch
- Can also be triggered manually from the Actions tab
- Preserves PR preview directories (pr-XX folders)

### 2. PR Preview Management (`pr-preview.yml`)
- Creates PR previews in `pr-XX` directories when PRs are opened/updated
- Replaces preview content with an informative redirect page when PRs are closed
- The redirect page:
  - Explains the PR preview is closed
  - Shows whether the PR was merged or just closed
  - Provides a link to the main site
  - Automatically redirects to the main site after 5 seconds

## Manual Fixes for Old PRs

### Fix PR #12, #13, #14, #9
Since these PRs were closed before this fix was implemented, you can manually run the "Fix PR #12 Preview" workflow (or create similar ones for #13, #14, #9) to update their redirect URLs:

1. Go to the Actions tab in GitHub
2. Select "Fix PR #12 Preview" from the workflows list
3. Click "Run workflow"
4. Wait for the workflow to complete

This will update the redirect URL to point to the correct location.

## For Future PRs
All future PRs will automatically:
- Get a preview when opened
- Have the preview updated when new commits are pushed
- Get an info/redirect page when closed (no manual intervention needed)

The main site will be kept up-to-date automatically on every push to main.
