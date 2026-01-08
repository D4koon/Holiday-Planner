# Fixing PR Preview 404 Errors

## Problem
When PRs are closed, their preview directories used to be deleted from the `gh-pages` branch, causing 404 errors when users tried to access the preview URLs.

## Solution
The PR preview workflow has been updated to replace preview content with an informative page that:
- Explains the PR preview is closed
- Provides a link to the main site
- Automatically redirects to the main site after 5 seconds

## Manual Fix for PR #12
Since PR #12 was closed before this fix was implemented, you need to manually run the "Fix PR #12 Preview" workflow:

1. Go to the Actions tab in GitHub
2. Select "Fix PR #12 Preview" from the workflows list
3. Click "Run workflow"
4. Wait for the workflow to complete

This will create the info page for PR #12 and fix the 404 error.

## For Future PRs
All future PRs will automatically get an info page when they are closed, so no manual intervention will be needed.
