import fs from 'fs';
import path from 'path';
import { Tab } from './types';
import { todayStr } from './utils';
import { callClaudeWithRetry } from './ai/claude-cli';
import { loadPreset, presetToSystemPrompt } from './ai/presets/loader';
import { research } from './ai/researcher';
import { generateCoverImage } from './ai/image-gen';
import { fetchGitHubActivity } from './sources/github';
import { devlogPrompt } from './ai/prompts/devlog';
import { publishAll, PublishResult } from './publish';

interface PipelineResult {
  tab: Tab;
  date: string;
  filePath: string;
  imagePath: string;
  title: string;
  publishResults?: PublishResult[];
}

export async function runPipeline(tab: Tab): Promise<PipelineResult> {
  const date = todayStr();
  console.log(`[pipeline] ${tab} 시작 (${date})`);

  // Step 1: 데이터 수집
  console.log(`[pipeline] 데이터 수집 중...`);
  let researchData: string;

  if (tab === 'devlog') {
    const activity = await fetchGitHubActivity();
    researchData = devlogPrompt('am', {
      commits: activity.commits.length,
      issues: activity.issues.length,
      prs: activity.prs.length,
      repos: Array.from(new Set(activity.commits.map(c => c.repo))),
      details: [
        ...activity.commits.slice(0, 10).map(c => `- [commit] ${c.repo}: ${c.message}`),
        ...activity.issues.slice(0, 5).map(i => `- [issue ${i.action}] ${i.repo}: ${i.title}`),
        ...activity.prs.slice(0, 5).map(p => `- [PR ${p.action}] ${p.repo}: ${p.title}`),
      ].join('\n'),
    });
  } else {
    const result = await research(tab);
    if (result.topics.length > 0) {
      researchData = `오늘의 ${tab} 관련 주제:\n\n${result.topics.map((t, i) =>
        `${i + 1}. ${t.title}\n   ${t.summary}${t.keyData ? `\n   핵심 데이터: ${t.keyData}` : ''}${t.source ? `\n   출처: ${t.source}` : ''}`
      ).join('\n\n')}`;
    } else {
      researchData = result.rawResponse || '오늘의 뉴스와 트렌드를 기반으로 글을 작성해주세요.';
    }
  }

  // Step 2: 프리셋 로드 + 글 생성
  console.log(`[pipeline] 글 생성 중 (Claude CLI)...`);
  const preset = loadPreset(tab);
  const systemPrompt = presetToSystemPrompt(preset);

  const existing = getExistingTitles(tab);
  let message = researchData;
  if (existing.length > 0) {
    message += `\n\n이미 다룬 주제 (중복 금지):\n${existing.slice(-10).map(t => `- "${t}"`).join('\n')}`;
  }

  const postResult = await callClaudeWithRetry({
    systemPrompt,
    message,
    timeout: 300000,
  });

  const postContent = postResult.response;

  // 제목 추출
  const lines = postContent.split('\n');
  const titleLine = lines.find(l => l.startsWith('# '));
  const title = titleLine ? titleLine.replace('# ', '').trim() : `${preset.label} - ${date}`;
  const body = lines.filter(l => l !== titleLine).join('\n').trim();

  // Step 3: 이미지 프롬프트 생성 + 이미지 생성
  console.log(`[pipeline] 이미지 생성 중...`);
  let imagePath = '';

  try {
    const imgPromptResult = await callClaudeWithRetry({
      systemPrompt: '기사 내용을 바탕으로 블로그 커버 이미지 프롬프트를 영어로 생성해. 60단어 이내. 사실적 사진 스타일. 텍스트/차트/그래프 절대 포함하지 마. 프롬프트만 출력.',
      message: body.slice(0, 1500),
      timeout: 30000,
    });

    if (imgPromptResult.response) {
      imagePath = await generateCoverImage(tab, title, date, imgPromptResult.response);
    }
  } catch (err) {
    console.error('[pipeline] 이미지 생성 실패 (계속 진행):', err);
  }

  // Step 4: MDX 저장
  const slug = `${date}`;
  const summary = body.split('\n').find(l => l.trim().length > 20)?.slice(0, 160) || title;

  const mdxContent = `---
title: "${title.replace(/"/g, '\\"')}"
tab: "${tab}"
date: "${date}"
summary: "${summary.replace(/"/g, '\\"')}"
lang: "ko"
${imagePath ? `image: "${imagePath}"` : ''}
---

${body}
`;

  const outputDir = path.join(process.cwd(), 'content/posts', tab);
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${slug}.mdx`);
  fs.writeFileSync(filePath, mdxContent, 'utf-8');

  console.log(`[pipeline] 저장 완료: ${filePath} (${postResult.durationMs}ms)`);

  // Step 5: 멀티플랫폼 발행
  console.log(`[pipeline] 멀티플랫폼 발행 중...`);
  let publishResults: PublishResult[] = [];
  try {
    const TAB_LABELS: Record<Tab, string[]> = {
      health: ['건강', '생활'],
      finance: ['재테크', '경제'],
      tech: ['테크', 'AI'],
      devlog: ['개발일지'],
      trending: ['핫토픽', '트렌드'],
    };
    publishResults = await publishAll({ title, content: body, tags: TAB_LABELS[tab] });
    for (const r of publishResults) {
      if (r.success) {
        console.log(`  [OK] ${r.platform}: ${r.url}`);
      } else {
        console.log(`  [SKIP] ${r.platform}: ${r.error}`);
      }
    }
  } catch (err) {
    console.error('[pipeline] 발행 실패 (계속 진행):', err);
  }

  return { tab, date, filePath, imagePath, title, publishResults };
}

function getExistingTitles(tab: Tab): string[] {
  const tabDir = path.join(process.cwd(), 'content/posts', tab);
  if (!fs.existsSync(tabDir)) return [];
  return fs.readdirSync(tabDir)
    .filter(f => f.endsWith('.mdx'))
    .map(file => {
      const raw = fs.readFileSync(path.join(tabDir, file), 'utf-8');
      const match = raw.match(/^title:\s*"(.+)"/m);
      return match ? match[1] : '';
    })
    .filter(Boolean);
}
