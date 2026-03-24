#!/usr/bin/env tsx
import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { generatePost, generateImagePrompt } from '../lib/ai/claude';
import { generateCoverImage } from '../lib/ai/image-gen';

const SOUL_PATH = '/Users/labo/My_vault/clawd/SOUL_뜨미.md';
const OUTPUT_DIR = path.join(process.cwd(), 'content/posts/devlog');

// Episode definitions: [ep number, day range, title hint]
const EPISODES: [number, [number, number], string][] = [
  [1,  [1, 7],   '첫 레포, 첫 배포'],
  [2,  [8, 14],  '심리테스트와 게임의 홍수'],
  [3,  [15, 21], '실용 프로젝트로 전환'],
  [4,  [22, 28], 'AI 에이전트 시스템 구축'],
  [5,  [29, 35], '매매봇, 실제 돈을 건 코딩'],
  [6,  [36, 42], '자동화와 무인 운영'],
  [7,  [43, 49], '토큰 발행, ACP 마켓'],
  [8,  [50, 56], '가재군단 30마리 완성'],
  [9,  [57, 63], '커맨드센터와 인프라'],
  [10, [64, 75], '지금 여기까지'],
];

// GitHub repos by creation date for cross-referencing
const REPOS_BY_PERIOD: Record<string, string[]> = {
  '1-7': ['menuqr', 'daily-planner', 'storyboard_ai', 'daily-vibe'],
  '8-14': ['kitchemojimerge', 'lemongame', 'memos', 'tired-test', 'villain-test', 'healing', 'love-destroyer', 'stock-bot', 'survive', 'todayme', 'wokrvillain-test', '2048game', 'studio_scd', 'visiblerayhomepage_1'],
  '15-21': ['archive_note', 'imaginary-story', 'data_ipji', 'fairytale-photo', 'jiwonhae-', 'subscription-manager'],
  '22-28': ['voicememo-ai', 'ddak-hana', 'ddumi', 'moodboard-studio', 'past-life-test', 'gangwon-travel'],
  '29-35': ['binance-spot-bot'],
  '36-42': ['second-brain'],
  '43-49': ['chunmyeong', 'chunmyeong-pet', 'mission-control', 'quantum-leap', 'backlot-dashboard'],
  '50-56': ['mahjong-play', 'landing-agent-team', 'my-house-price', 'openclaw-vault', 'pomo-room', 'gostop-play'],
  '57-63': ['ddak-photo-detail', 'quantum-leap-v2'],
  '64-75': ['rabo-command-center', 'dailybloglabo', 'exhibition-playlist-generator'],
};

function readSoulFile(): string {
  return fs.readFileSync(SOUL_PATH, 'utf-8');
}

function extractDayEntries(soul: string): Map<number, string> {
  const entries = new Map<number, string>();
  const regex = /### \d{4}\.\d{2}\.\d{2} \((\d+)일차[^)]*\)([^\n]*)\n([\s\S]*?)(?=### \d{4}\.\d{2}\.\d{2}|## [^#]|---\n## )/g;
  let match;
  while ((match = regex.exec(soul)) !== null) {
    const day = parseInt(match[1]);
    const titleSuffix = match[2].trim();
    const content = match[3].trim();
    const existing = entries.get(day) || '';
    entries.set(day, existing + (existing ? '\n\n' : '') + `**${day}일차${titleSuffix ? ' ' + titleSuffix : ''}**\n${content}`);
  }
  return entries;
}

function getEntriesForRange(entries: Map<number, string>, start: number, end: number): string {
  const parts: string[] = [];
  for (let d = start; d <= end; d++) {
    if (entries.has(d)) {
      parts.push(entries.get(d)!);
    }
  }
  return parts.join('\n\n---\n\n');
}

async function generateEpisode(
  epNum: number,
  dayRange: [number, number],
  titleHint: string,
  rawData: string,
  repos: string[]
): Promise<void> {
  // Publish date: trailer is 2026-03-24, EP.01 starts 2026-03-25
  const publishDate = new Date('2026-03-25');
  publishDate.setDate(publishDate.getDate() + (epNum - 1));
  const dateStr = publishDate.toISOString().split('T')[0];

  const slug = `${dateStr}-am-ko`;
  const filePath = path.join(OUTPUT_DIR, `${slug}.mdx`);

  if (fs.existsSync(filePath)) {
    console.log(`[EP.${String(epNum).padStart(2, '0')}] Already exists, skipping: ${slug}`);
    return;
  }

  console.log(`[EP.${String(epNum).padStart(2, '0')}] Generating (${dayRange[0]}~${dayRange[1]}일차)...`);

  const repoList = repos.length > 0 ? `\n\n이 기간에 만든 GitHub 레포: ${repos.join(', ')}` : '';

  const systemPrompt = `한국어로 작성하세요. 번역체가 아닌 자연스러운 한국어 문체를 사용하세요.

당신은 "바이브코딩 75일" 시리즈의 EP.${String(epNum).padStart(2, '0')}을 쓰는 블로거입니다.
주인공은 코딩 경험 제로의 포토그래퍼가 AI만으로 프로젝트를 만들어가는 사람입니다.

아래는 실제 작업 로그 원본입니다. 이 데이터를 바탕으로 읽기 좋은 블로그 글로 재구성하세요.

글쓰기 규칙:
- "# " 으로 시작하는 제목 한 줄 먼저 쓸 것. 형식: "EP.${String(epNum).padStart(2, '0')} — [제목]"
- 일기처럼 생생하게. 그날 실제로 뭘 했는지, 뭘 느꼈는지.
- 기술적 내용도 비개발자가 이해할 수 있게 풀어서.
- 과장 금지. "혁신적", "놀라운" 같은 AI 냄새 나는 단어 금지.
- 괄호 안 사족 금지.
- 800~1200 단어.
- 이모지 금지.`;

  const userPrompt = `EP.${String(epNum).padStart(2, '0')} — ${dayRange[0]}일차~${dayRange[1]}일차: ${titleHint}

작업 로그 원본:
${rawData.slice(0, 6000)}${repoList}`;

  const content = await generatePost(systemPrompt, userPrompt, 'ko');

  // Extract title
  const lines = content.split('\n');
  const titleLine = lines.find(l => l.startsWith('# '));
  const title = titleLine ? titleLine.replace('# ', '').trim() : `EP.${String(epNum).padStart(2, '0')} — ${titleHint}`;
  const body = lines.filter(l => l !== titleLine).join('\n').trim();
  const summary = body.split('\n').find(l => l.trim().length > 20)?.slice(0, 160) || title;

  // Generate cover image
  console.log(`[EP.${String(epNum).padStart(2, '0')}] Generating cover image...`);
  const imagePrompt = await generateImagePrompt(body.slice(0, 1500), 'devlog');
  const imagePath = await generateCoverImage('devlog', title, dateStr, 'am', imagePrompt || undefined);

  // Write MDX
  const mdx = `---
title: "${title.replace(/"/g, '\\"')}"
tab: "devlog"
edition: "am"
date: "${dateStr}"
summary: "${summary.replace(/"/g, '\\"')}"
lang: "ko"
${imagePath ? `image: "${imagePath}"` : ''}
---

${body}
`;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(filePath, mdx, 'utf-8');
  console.log(`[EP.${String(epNum).padStart(2, '0')}] Done! → ${slug}`);
}

async function main() {
  const args = process.argv.slice(2);
  const epArg = args.find(a => a.startsWith('--ep='))?.split('=')[1];

  const soul = readSoulFile();
  const entries = extractDayEntries(soul);

  console.log(`SOUL 파일에서 ${entries.size}개 일차 기록 추출\n`);

  if (epArg) {
    const epNum = parseInt(epArg);
    const ep = EPISODES.find(e => e[0] === epNum);
    if (!ep) {
      console.error(`EP.${epArg} not found. Valid: 1-10`);
      process.exit(1);
    }
    const [num, range, hint] = ep;
    const rawData = getEntriesForRange(entries, range[0], range[1]);
    const repoKey = `${range[0]}-${range[1]}`;
    const repos = REPOS_BY_PERIOD[repoKey] || [];
    await generateEpisode(num, range, hint, rawData, repos);
  } else {
    // Generate all episodes sequentially
    for (const [num, range, hint] of EPISODES) {
      const rawData = getEntriesForRange(entries, range[0], range[1]);
      const repoKey = `${range[0]}-${range[1]}`;
      const repos = REPOS_BY_PERIOD[repoKey] || [];
      await generateEpisode(num, range, hint, rawData, repos);
    }
  }

  console.log('\nAll done!');
}

main();
