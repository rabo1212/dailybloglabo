#!/usr/bin/env tsx
import { config } from 'dotenv';
config({ path: '.env.local' });

import { runPipeline } from '../lib/pipeline';
import { Tab } from '../lib/types';

const VALID_TABS: Tab[] = ['health', 'finance', 'tech', 'devlog', 'trending'];

async function main() {
  const args = process.argv.slice(2);
  const tabArg = args.find(a => a.startsWith('--tab='))?.split('=')[1];
  const allFlag = args.includes('--all');

  if (allFlag) {
    console.log(`\n=== 전체 탭 생성 시작 ===\n`);

    for (const tab of VALID_TABS) {
      try {
        const result = await runPipeline(tab);
        console.log(`  [OK] ${tab}: ${result.title}`);
      } catch (err) {
        console.error(`  [FAIL] ${tab}:`, err);
      }
    }
    return;
  }

  if (!tabArg) {
    console.log(`
DailyBlogLabo v2 Post Generator

Usage:
  npx tsx scripts/generate.ts --tab=health
  npx tsx scripts/generate.ts --all

Tabs: ${VALID_TABS.join(', ')}
`);
    return;
  }

  const tab = tabArg as Tab;
  if (!VALID_TABS.includes(tab)) {
    console.error(`Invalid tab: ${tabArg}. Use: ${VALID_TABS.join(', ')}`);
    process.exit(1);
  }

  const result = await runPipeline(tab);
  console.log(`\n생성 완료: ${result.title}`);
  console.log(`파일: ${result.filePath}`);
  if (result.imagePath) console.log(`이미지: ${result.imagePath}`);
}

main().catch(console.error);
