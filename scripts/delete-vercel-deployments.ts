#!/usr/bin/env tsx
/**
 * Script to delete all previous deployments for the heirvault-app project
 * 
 * Usage:
 *   tsx scripts/delete-vercel-deployments.ts
 * 
 * Requires VERCEL_TOKEN environment variable or Vercel CLI authentication
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ID = 'prj_HUZ2pGqho7dirfbcD3Gb2Bt2qnt5';
const TEAM_ID = 'team_aUqLgadKU2HcHBgWAvesQ8OR';
const VERCEL_API_BASE = 'https://api.vercel.com';

interface Deployment {
  id?: string;
  uid?: string;
  name: string;
  url: string;
  state: string;
  created: number;
}

interface DeploymentsResponse {
  deployments: Deployment[];
  pagination?: {
    next?: number;
    prev?: number;
  };
}

async function getVercelToken(): Promise<string> {
  // Try environment variable first
  if (process.env.VERCEL_TOKEN) {
    return process.env.VERCEL_TOKEN;
  }

  // Try to get from Vercel CLI config (multiple possible locations)
  const possiblePaths = [
    join(homedir(), '.vercel', 'auth.json'),
    join(process.env.APPDATA || '', 'vercel', 'auth.json'),
    join(process.env.LOCALAPPDATA || '', 'vercel', 'auth.json'),
  ];

  for (const configPath of possiblePaths) {
    try {
      if (readFileSync(configPath, { encoding: 'utf-8', flag: 'r' })) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        // Vercel auth.json structure: { "token": "..." } or { "username": { "token": "..." } }
        if (config.token) {
          return config.token;
        }
        const token = Object.values(config)[0] as any;
        if (token?.token) {
          return token.token;
        }
      }
    } catch (error) {
      // File doesn't exist or is invalid, try next path
      continue;
    }
  }

  // Try using Vercel CLI to get token (if available)
  try {
    const { execSync } = await import('child_process');
    // Vercel CLI doesn't expose token directly, but we can try to read it from the config
    // For now, we'll ask the user to set it
  } catch (error) {
    // CLI not available
  }

  throw new Error(
    'VERCEL_TOKEN environment variable not set. ' +
    'Please set it with: $env:VERCEL_TOKEN="your-token" (PowerShell) or ' +
    'export VERCEL_TOKEN="your-token" (Bash), or get it from https://vercel.com/account/tokens'
  );
}

async function fetchAllDeployments(token: string): Promise<Deployment[]> {
  const allDeployments: Deployment[] = [];
  let until: number | undefined = undefined;
  let hasMore = true;

  console.log('Fetching all deployments...');

  while (hasMore) {
    const url = new URL(`${VERCEL_API_BASE}/v6/deployments`);
    url.searchParams.set('projectId', PROJECT_ID);
    url.searchParams.set('teamId', TEAM_ID);
    url.searchParams.set('limit', '100');
    if (until) {
      url.searchParams.set('until', until.toString());
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch deployments: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    
    // Handle different possible response structures
    const deployments = data.deployments || data.deployment || [];
    allDeployments.push(...deployments);

    console.log(`  Fetched ${data.deployments.length} deployments (total: ${allDeployments.length})`);

    // Check if there are more pages
    if (data.pagination?.next) {
      until = data.pagination.next;
    } else {
      hasMore = false;
    }
  }

  return allDeployments;
}

async function deleteDeployment(token: string, deploymentId: string): Promise<boolean> {
  const url = `${VERCEL_API_BASE}/v13/deployments/${deploymentId}?teamId=${TEAM_ID}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  ❌ Failed to delete ${deploymentId}: ${response.status} ${error}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`  ❌ Error deleting ${deploymentId}: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting deployment cleanup for heirvault-app...\n');

    // Get Vercel token
    const token = await getVercelToken();
    console.log('✅ Authenticated with Vercel\n');

    // Fetch all deployments
    const deployments = await fetchAllDeployments(token);
    console.log(`\n📦 Found ${deployments.length} total deployments\n`);

    if (deployments.length === 0) {
      console.log('✨ No deployments to delete!');
      return;
    }

    // Show summary
    const states = deployments.reduce((acc, dep) => {
      acc[dep.state] = (acc[dep.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Deployment states:');
    Object.entries(states).forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });
    console.log('');

    // Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL deployments!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all deployments
    console.log('🗑️  Deleting deployments...\n');
    let successCount = 0;
    let failCount = 0;

    for (const deployment of deployments) {
      // Vercel API uses 'uid' for deployment identifier
      const deploymentId = deployment.uid || deployment.id;
      
      // Ensure we have a valid deployment ID
      if (!deploymentId) {
        console.error(`  ⚠️  Skipping deployment with no ID/UID:`, JSON.stringify(deployment).substring(0, 100));
        failCount++;
        continue;
      }
      
      const date = new Date(deployment.created).toLocaleString();
      console.log(`Deleting ${deploymentId} (${deployment.state}, ${date})...`);
      
      const success = await deleteDeployment(token, deploymentId);
      if (success) {
        successCount++;
        console.log(`  ✅ Deleted ${deploymentId}\n`);
      } else {
        failCount++;
        console.log(`  ❌ Failed to delete ${deploymentId}\n`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`  ✅ Successfully deleted: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📦 Total: ${deployments.length}`);
    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

