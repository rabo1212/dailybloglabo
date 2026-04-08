#!/usr/bin/env tsx
import { config } from 'dotenv';
config({ path: '.env.local' });

import { runPipeline } from '../lib/pipeline';
import { Tab, Edition, Lang } from '../lib/types';

const VALID_TABS: Tab[] = ['devlog', 'health', 'finance', 'tech', 'trending'];
const VALID_EDITIONS: Edition[] = ['am', 'pm'];
const VALID_LANGS: Lang[] = ['en', 'ko'];

async function main() {
  const args = process.argv.slice(2);
  const tabArg = args.find(a => a.startsWith('--tab='))?.split('=')[1];
  const editionArg = args.find(a => a.startsWith('--edition='))?.split('=')[1];
  const langArg = args.find(a => a.startsWith('--lang='))?.split('=')[1];
  const allFlag = args.includes('--all');

  // Determine which languages to generate
  let langs: Lang[];
  if (langArg) {
    if (!VALID_LANGS.includes(langArg as Lang)) {
      console.error(`Invalid lang: ${langArg}. Use: en, ko`);
      process.exit(1);
    }
    langs = [langArg as Lang];
  } else {
    // Default: generate both languages
    langs = ['en', 'ko'];
  }

  if (allFlag && editionArg) {
    // Run all tabs for a specific edition
    const edition = editionArg as Edition;
    if (!VALID_EDITIONS.includes(edition)) {
      console.error(`Invalid edition: ${editionArg}. Use: am, pm`);
      process.exit(1);
    }

    console.log(`\n=== Running ALL tabs for ${edition.toUpperCase()} edition [${langs.join(', ').toUpperCase()}] ===\n`);

    const tasks: { tab: Tab; lang: Lang }[] = [];
    for (const tab of VALID_TABS) {
      for (const lang of langs) {
        tasks.push({ tab, lang });
      }
    }

    const results = await Promise.allSettled(
      tasks.map(({ tab, lang }) => runPipeline(tab, edition, lang))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { tab, lang } = tasks[i];
      if (result.status === 'fulfilled') {
        console.log(`  [OK] ${tab} (${lang}): ${result.value.title}`);
      } else {
        console.error(`  [FAIL] ${tab} (${lang}): ${result.reason}`);
      }
    }
    return;
  }

  if (!tabArg || !editionArg) {
    console.log(`
DailyBlogLabo Post Generator

Usage:
  npx tsx scripts/generate.ts --tab=ai --edition=am
  npx tsx scripts/generate.ts --tab=ai --edition=am --lang=ko
  npx tsx scripts/generate.ts --all --edition=am
  npx tsx scripts/generate.ts --all --edition=pm --lang=en

Tabs: ${VALID_TABS.join(', ')}
Editions: am (morning), pm (evening)
Languages: en (English), ko (Korean) - default: both
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

  for (const lang of langs) {
    try {
      const result = await runPipeline(tab, edition, lang);
      console.log(`\nGenerated (${lang}): ${result.title}`);
      console.log(`File: ${result.filePath}`);
      if (result.imagePath) console.log(`Image: ${result.imagePath}`);
    } catch (error) {
      console.error(`Generation failed (${lang}):`, error);
      process.exit(1);
    }
  }
}

main();
