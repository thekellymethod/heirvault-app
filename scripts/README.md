# Scripts

## delete-vercel-deployments.ts

This script deletes all previous deployments for the heirvault-app project.

### Usage

1. **Get your Vercel API token:**
   - Go to https://vercel.com/account/tokens
   - Create a new token (or use an existing one)
   - Copy the token

2. **Set the token as an environment variable:**

   **PowerShell:**
   ```powershell
   $env:VERCEL_TOKEN="your-token-here"
   ```

   **Bash/Unix:**
   ```bash
   export VERCEL_TOKEN="your-token-here"
   ```

3. **Run the script:**
   ```bash
   npm run delete:deployments
   ```

   Or directly:
   ```bash
   tsx scripts/delete-vercel-deployments.ts
   ```

### What it does

- Fetches all deployments for the heirvault-app project
- Shows a summary of deployment states
- Waits 5 seconds for you to cancel (Ctrl+C)
- Deletes all deployments one by one
- Shows a summary of successful and failed deletions

### Safety

The script includes:
- A 5-second warning before deletion
- Progress indicators for each deployment
- Error handling for failed deletions
- A final summary report

