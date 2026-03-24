import fs from 'fs';
import path from 'path';
import { Tab, Edition, Lang } from './types';
import { todayStr } from './utils';
import { fetchGitHubActivity } from './sources/github';
import { fetchAINews } from './sources/ai-news';
import { fetchCryptoData } from './sources/crypto';
import { fetchStockData } from './sources/stocks';
import { fetchTrendingData } from './sources/trending';
import { generatePost, generateImagePrompt } from './ai/claude';
import { generateCoverImage } from './ai/image-gen';
import { devlogPrompt } from './ai/prompts/devlog';
import { aiNewsPrompt } from './ai/prompts/ai-news';
import { cryptoPrompt } from './ai/prompts/crypto';
import { stocksPrompt } from './ai/prompts/stocks';
import { hotTopicsPrompt } from './ai/prompts/hot-topics';

interface PipelineResult {
  tab: Tab;
  edition: Edition;
  lang: Lang;
  date: string;
  filePath: string;
  imagePath: string;
  title: string;
}

export async function runPipeline(tab: Tab, edition: Edition, lang: Lang = 'en'): Promise<PipelineResult> {
  const date = todayStr();
  console.log(`[pipeline] Starting ${tab} ${edition.toUpperCase()} [${lang.toUpperCase()}] edition for ${date}`);

  // Step 1: Fetch data
  console.log(`[pipeline] Fetching data for ${tab}...`);
  const prompt = await buildPrompt(tab, edition);

  // Step 2: Generate post with Claude
  console.log(`[pipeline] Generating post with Claude (${lang})...`);
  const langInstruction = lang === 'ko' ? 'Write in Korean (한국어).' : 'Write in English.';
  const systemPrompt = `You are a senior journalist and analyst writing for DAYLOG_EV, a daily tech/finance newsletter read by developers and founders. ${langInstruction}

Output ONLY the blog post content in markdown format. Start with a compelling title on the first line prefixed with "# ".

Writing standards:
- Write with depth and insight, not just surface-level summaries
- Explain WHY things matter, not just WHAT happened
- Connect dots between different stories and broader trends
- Include specific data points, names, and figures
- Add your analytical perspective — what does this mean going forward?
- Use vivid, engaging prose that keeps readers scrolling
- Minimum 800 words, aim for 1000-1200 words
- Each section should have substantial content, not just bullet points`;
  const postContent = await generatePost(systemPrompt, prompt, lang);

  // Extract title from first line
  const lines = postContent.split('\n');
  const titleLine = lines.find(l => l.startsWith('# '));
  const title = titleLine ? titleLine.replace('# ', '').trim() : `${tab} ${edition.toUpperCase()} - ${date}`;
  const body = lines.filter(l => l !== titleLine).join('\n').trim();

  // Step 3: Generate cover image based on article content
  console.log(`[pipeline] Generating image prompt from article...`);
  const imagePrompt = await generateImagePrompt(body, tab);
  console.log(`[pipeline] Image prompt: ${imagePrompt.slice(0, 80)}...`);
  console.log(`[pipeline] Generating cover image...`);
  const imagePath = await generateCoverImage(tab, title, date, edition, imagePrompt);

  // Step 4: Write MDX file
  // Korean posts get -ko suffix, English posts have no suffix (backwards compatible)
  const slug = lang === 'ko' ? `${date}-${edition}-ko` : `${date}-${edition}`;
  const summary = body.split('\n').find(l => l.trim().length > 20)?.slice(0, 160) || title;
  const mdxContent = buildMDX({ title, tab, edition, date, summary, imagePath, body, lang });

  const outputDir = path.join(process.cwd(), 'content/posts', tab);
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${slug}.mdx`);
  fs.writeFileSync(filePath, mdxContent, 'utf-8');

  console.log(`[pipeline] Done! Saved to ${filePath}`);
  return { tab, edition, lang, date, filePath, imagePath, title };
}

function getExistingTitles(tab: Tab): string[] {
  const tabDir = path.join(process.cwd(), 'content/posts', tab);
  if (!fs.existsSync(tabDir)) return [];
  const files = fs.readdirSync(tabDir).filter(f => f.endsWith('.mdx'));
  const titles: string[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(tabDir, file), 'utf-8');
    const match = raw.match(/^title:\s*"(.+)"/m);
    if (match) titles.push(match[1]);
  }
  return titles;
}

async function buildPrompt(tab: Tab, edition: Edition): Promise<string> {
  switch (tab) {
    case 'devlog': {
      const activity = await fetchGitHubActivity();
      const repos = Array.from(new Set(activity.commits.map(c => c.repo)));
      const details = [
        ...activity.commits.slice(0, 10).map(c => `- [commit] ${c.repo}: ${c.message}`),
        ...activity.issues.slice(0, 5).map(i => `- [issue ${i.action}] ${i.repo}: ${i.title}`),
        ...activity.prs.slice(0, 5).map(p => `- [PR ${p.action}] ${p.repo}: ${p.title}`),
      ].join('\n');
      return devlogPrompt(edition, {
        commits: activity.commits.length,
        issues: activity.issues.length,
        prs: activity.prs.length,
        repos,
        details,
      });
    }
    case 'ai': {
      const sources = await fetchAINews();
      return aiNewsPrompt(edition, sources);
    }
    case 'crypto': {
      const data = await fetchCryptoData();
      return cryptoPrompt(edition, data);
    }
    case 'stocks': {
      const data = await fetchStockData();
      return stocksPrompt(edition, data);
    }
    case 'hot': {
      const data = await fetchTrendingData();
      const existing = getExistingTitles('hot');
      let prompt = hotTopicsPrompt(edition, data);
      if (existing.length > 0) {
        prompt += `\n\nIMPORTANT: The following topics have ALREADY been covered. Do NOT write about them again. Pick DIFFERENT stories from the trending data:\n${existing.map(t => `- "${t}"`).join('\n')}`;
      }
      return prompt;
    }
  }
}

function buildMDX(opts: {
  title: string;
  tab: Tab;
  edition: Edition;
  date: string;
  summary: string;
  imagePath: string;
  body: string;
  lang: Lang;
}): string {
  return `---
title: "${opts.title.replace(/"/g, '\\"')}"
tab: "${opts.tab}"
edition: "${opts.edition}"
date: "${opts.date}"
summary: "${opts.summary.replace(/"/g, '\\"')}"
lang: "${opts.lang}"
${opts.imagePath ? `image: "${opts.imagePath}"` : ''}
---

${opts.body}
`;
}
