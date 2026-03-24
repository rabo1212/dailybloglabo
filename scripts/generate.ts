#!/usr/bin/env tsx
import { config } from 'dotenv';
config({ path: '.env.local' });

import { runPipeline } from '../lib/pipeline';
import { Tab, Edition } from '../lib/types';

const VALID_TABS: Tab[] = ['devlog', 'ai', 'crypto', 'stocks', 'hot'];
const VALID_EDITIONS: Edition[] = ['am', 'pm'];

async function main() {
  const args = process.argv.slice(2);
  const tabArg = args.find(a => a.startsWith('--tab='))?.split('=')[1];
  const editionArg = args.find(a => a.startsWith('--edition='))?.split('=')[1];
  const allFlag = args.includes('--all');

  if (allFlag && editionArg) {
    // Run all tabs for a specific edition
    const edition = editionArg as Edition;
    if (!VALID_EDITIONS.includes(edition)) {
      console.error(`Invalid edition: ${editionArg}. Use: am, pm`);
      process.exit(1);
    }

    console.log(`\n=== Running ALL tabs for ${edition.toUpperCase()} edition ===\n`);
    const results = await Promise.allSettled(
      VALID_TABS.map(tab => runPipeline(tab, edition))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const tab = VALID_TABS[i];
      if (result.status === 'fulfilled') {
        console.log(`  [OK] ${tab}: ${result.value.title}`);
      } else {
        console.error(`  [FAIL] ${tab}: ${result.reason}`);
      }
    }
    return;
  }

  if (!tabArg || !editionArg) {
    console.log(`
DailyBlogLabo Post Generator

Usage:
  npx tsx scripts/generate.ts --tab=ai --edition=am
  npx tsx scripts/generate.ts --all --edition=am
  npx tsx scripts/generate.ts --all --edition=pm

Tabs: ${VALID_TABS.join(', ')}
Editions: am (morning), pm (evening)
`);
    process.exit(0);
  }

  const tab = tabArg as Tab;
  const edition = editionArg as Edition;

  if (!VALID_TABS.includes(tab)) {
    console.error(`Invalid tab: ${tabArg}. Use: ${VALID_TABS.join(', ')}`);
    process.exit(1);
  }
  if (!VALID_EDITIONS.includes(edition)) {
    console.error(`Invalid edition: ${editionArg}. Use: am, pm`);
    process.exit(1);
  }

  try {
    const result = await runPipeline(tab, edition);
    console.log(`\nGenerated: ${result.title}`);
    console.log(`File: ${result.filePath}`);
    if (result.imagePath) console.log(`Image: ${result.imagePath}`);
  } catch (error) {
    console.error('Generation failed:', error);
    process.exit(1);
  }
}

main();
