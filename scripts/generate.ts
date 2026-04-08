#!/usr/bin/env tsx
import { config } from 'dotenv';
config({ path: '.env.local' });

import { runPipeline } from '../lib/pipeline';
import { Tab } from '../lib/types';
import { sendTelegramNotify } from '../lib/notify';

const VALID_TABS: Tab[] = ['health', 'finance', 'tech', 'devlog', 'trending'];

async function main() {
  const args = process.argv.slice(2);
  const tabArg = args.find(a => a.startsWith('--tab='))?.split('=')[1];
  const allFlag = args.includes('--all');

  if (allFlag) {
    console.log(`\n=== 전체 탭 생성 시작 ===\n`);

    const results: Array<{ tab: Tab; success: boolean; title?: string; error?: string }> = [];

    for (const tab of VALID_TABS) {
      try {
        const result = await runPipeline(tab);
        results.push({ tab, success: true, title: result.title });
        console.log(`  [OK] ${tab}: ${result.title}`);
      } catch (err) {
        results.push({ tab, success: false, error: String(err) });
        console.error(`  [FAIL] ${tab}:`, err);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const successCount = results.filter(r => r.success).length;
    const summary = results.map(r =>
      r.success ? `✅ ${r.tab}: ${r.title}` : `❌ ${r.tab}: 실패`
    ).join('\n');

    await sendTelegramNotify(
      `📝 *DailyBlogLabo* 자동 발행 완료\n\n날짜: ${today}\n성공: ${successCount}/${VALID_TABS.length}\n\n${summary}`
    );

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
