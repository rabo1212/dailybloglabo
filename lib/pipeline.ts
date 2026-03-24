import fs from 'fs';
import path from 'path';
import { Tab, Edition, Lang } from './types';
import { todayStr } from './utils';
import { fetchGitHubActivity } from './sources/github';
import { fetchAINews } from './sources/ai-news';
import { fetchCryptoData } from './sources/crypto';
import { fetchStockData } from './sources/stocks';
import { fetchTrendingData } from './sources/trending';
import { generatePost } from './ai/claude';
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
  const systemPrompt = `You are a professional blog writer for DailyBlogLabo. ${langInstruction} Output ONLY the blog post content in markdown format. Start with a compelling title on the first line prefixed with "# ".`;
  const postContent = await generatePost(systemPrompt, prompt, lang);

  // Extract title from first line
  const lines = postContent.split('\n');
  const titleLine = lines.find(l => l.startsWith('# '));
  const title = titleLine ? titleLine.replace('# ', '').trim() : `${tab} ${edition.toUpperCase()} - ${date}`;
  const body = lines.filter(l => l !== titleLine).join('\n').trim();

  // Step 3: Generate cover image
  console.log(`[pipeline] Generating cover image...`);
  const imagePath = await generateCoverImage(tab, title, date, edition);

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
      return hotTopicsPrompt(edition, data);
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
