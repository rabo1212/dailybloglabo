# DailyBlogLabo v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DailyBlogLabo를 5개 새 탭(건강/재테크/테크/개발일지/핫토픽)으로 재구성하고, Claude CLI spawn + NanoBanana 이미지 + 멀티플랫폼 발행(티스토리/네이버) 파이프라인을 구축한다.

**Architecture:** 기존 Next.js 14 + MDX 정적 블로그 프레임워크를 유지하면서, AI 엔진을 Anthropic SDK → Claude CLI spawn으로 교체. 스타일 프리셋 YAML로 탭별 톤 분리. 파이프라인에 웹 리서치 → 글 생성 → 이미지 생성 → MDX 저장 → 멀티플랫폼 발행 단계를 추가.

**Tech Stack:** Next.js 14, TypeScript, MDX, Claude Code CLI, NanoBanana (Gemini), 티스토리 API, 네이버 블로그 API

---

### Task 1: 탭/타입 변경 + 기존 포스트 정리

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/utils.ts:9` (탭 배열)
- Modify: `app/[tab]/page.tsx:7` (VALID_TABS 배열)
- Modify: `app/layout.tsx:9` (사이트 제목)
- Modify: `components/Header.tsx:10` (사이트 제목)
- Delete: `content/posts/ai/`, `content/posts/crypto/`, `content/posts/stocks/`, `content/posts/hot/`
- Create: `content/posts/health/.gitkeep`
- Create: `content/posts/finance/.gitkeep`
- Create: `content/posts/tech/.gitkeep`
- Create: `content/posts/trending/.gitkeep`

- [ ] **Step 1: lib/types.ts 수정**

```typescript
export type Tab = 'health' | 'finance' | 'tech' | 'devlog' | 'trending';
export type Edition = 'am' | 'pm';
export type Lang = 'en' | 'ko';

export interface PostFrontmatter {
  title: string;
  tab: Tab;
  edition: Edition;
  date: string;
  summary: string;
  image?: string;
  lang?: Lang;
}

export interface Post extends PostFrontmatter {
  slug: string;
  content: string;
}

export const TAB_CONFIG: Record<Tab, { label: string; color: string; colorClass: string }> = {
  health:   { label: '건강/생활',   color: '#34d399', colorClass: 'text-health' },
  finance:  { label: '재테크/경제', color: '#fbbf24', colorClass: 'text-finance' },
  tech:     { label: '테크/AI',     color: '#22d3ee', colorClass: 'text-tech' },
  devlog:   { label: '개발일지',    color: '#a5a5ff', colorClass: 'text-devlog' },
  trending: { label: '핫토픽',      color: '#fb923c', colorClass: 'text-trending' },
};
```

기존 데이터 소스 타입(`GitHubEvent`, `HNStory`, `AISources`, `CryptoData`, `StockData`, `TrendingData`)은 삭제. `GitHubEvent`와 `TrendingData`만 유지하되, 나중에 Task 4에서 새 소스 타입으로 대체.

- [ ] **Step 2: lib/utils.ts 수정**

`lib/utils.ts`의 9번 줄 탭 배열 변경:

```typescript
const tabs: Tab[] = ['health', 'finance', 'tech', 'devlog', 'trending'];
```

- [ ] **Step 3: app/[tab]/page.tsx 수정**

7번 줄 VALID_TABS 변경:

```typescript
const VALID_TABS: Tab[] = ["health", "finance", "tech", "devlog", "trending"];
```

- [ ] **Step 4: app/layout.tsx + Header.tsx 사이트 이름 변경**

`app/layout.tsx` metadata:
```typescript
export const metadata: Metadata = {
  title: "데일리블로그라보",
  description: "매일 자동 발행되는 AI 블로그",
};
```

`components/Header.tsx` 10번 줄:
```tsx
DAYLOG_EV → 데일리블로그라보
```

`app/layout.tsx`의 `<html lang="en">` → `<html lang="ko">`

- [ ] **Step 5: tailwind.config.ts 색상 추가**

기존 `ainews`, `crypto`, `stocks`, `hottopic` 색상을 새 탭 색상으로 교체:

```typescript
colors: {
  health: '#34d399',
  finance: '#fbbf24',
  tech: '#22d3ee',
  devlog: '#a5a5ff',
  trending: '#fb923c',
}
```

- [ ] **Step 6: 기존 포스트 폴더 정리 + 새 폴더 생성**

```bash
cd /Users/labo/My_vault/dailybloglabo
rm -rf content/posts/ai content/posts/crypto content/posts/stocks content/posts/hot
mkdir -p content/posts/health content/posts/finance content/posts/tech content/posts/trending
touch content/posts/health/.gitkeep content/posts/finance/.gitkeep content/posts/tech/.gitkeep content/posts/trending/.gitkeep
```

`content/posts/devlog/`는 유지.

- [ ] **Step 7: 빌드 테스트**

```bash
cd /Users/labo/My_vault/dailybloglabo && npm run build
```

Expected: 빌드 성공 (포스트 없어도 정상 동작해야 함)

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "refactor: 탭 구조 변경 (health/finance/tech/devlog/trending)"
```

---

### Task 2: Claude CLI 엔진 구현

**Files:**
- Create: `lib/ai/claude-cli.ts`
- Modify: `package.json` (불필요한 의존성 제거)

- [ ] **Step 1: lib/ai/claude-cli.ts 작성**

```typescript
import { spawn } from 'child_process';

const CLAUDE_PATH = '/Users/labo/.local/bin/claude';

interface CLIOptions {
  systemPrompt: string;
  message: string;
  timeout?: number;
}

interface CLIResult {
  response: string;
  durationMs: number;
}

export async function callClaude(opts: CLIOptions): Promise<CLIResult> {
  const { systemPrompt, message, timeout = 120000 } = opts;
  const start = Date.now();

  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'bypassPermissions',
    '--system-prompt', systemPrompt,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_PATH, args, {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin.write(message);
    proc.stdin.end();

    let finalResult = '';
    let stderrBuf = '';
    let lineBuf = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      lineBuf += chunk.toString();
      const lines = lineBuf.split('\n');
      lineBuf = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === 'result' && evt.result) {
            finalResult = evt.result;
          }
        } catch {}
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Claude CLI 타임아웃: ${timeout / 1000}초 초과`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;

      if (code !== 0 && !finalResult) {
        reject(new Error(`Claude CLI 에러 (code ${code}): ${stderrBuf.slice(0, 300)}`));
        return;
      }

      resolve({ response: (finalResult || '').trim(), durationMs });
    });
  });
}

export async function callClaudeWithRetry(opts: CLIOptions, retries = 1): Promise<CLIResult> {
  try {
    return await callClaude(opts);
  } catch (err) {
    if (retries > 0) {
      console.log('[claude-cli] 재시도 중...');
      return callClaudeWithRetry(opts, retries - 1);
    }
    throw err;
  }
}
```

- [ ] **Step 2: 테스트 — CLI spawn 동작 확인**

```bash
cd /Users/labo/My_vault/dailybloglabo
npx tsx -e "
const { callClaude } = require('./lib/ai/claude-cli');
callClaude({
  systemPrompt: '한 줄로 답하세요.',
  message: '오늘 날짜를 알려줘',
}).then(r => console.log('OK:', r.response.slice(0, 100), r.durationMs + 'ms'))
  .catch(e => console.error('FAIL:', e.message));
"
```

Expected: 오늘 날짜가 포함된 응답 + 소요시간

- [ ] **Step 3: package.json에서 불필요 의존성 제거**

```bash
npm uninstall @anthropic-ai/sdk @fal-ai/client replicate
```

`lib/ai/claude.ts`는 삭제하지 않고 보존 (폴백용). 단, pipeline에서 import를 claude-cli.ts로 변경.

- [ ] **Step 4: 커밋**

```bash
git add lib/ai/claude-cli.ts package.json package-lock.json
git commit -m "feat: Claude CLI spawn 엔진 추가, SDK 의존성 제거"
```

---

### Task 3: 스타일 프리셋 YAML 작성

**Files:**
- Create: `lib/ai/presets/health.yaml`
- Create: `lib/ai/presets/finance.yaml`
- Create: `lib/ai/presets/tech.yaml`
- Create: `lib/ai/presets/devlog.yaml`
- Create: `lib/ai/presets/trending.yaml`
- Create: `lib/ai/presets/loader.ts`

- [ ] **Step 1: 프리셋 로더 작성**

`lib/ai/presets/loader.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import type { Tab } from '@/lib/types';

export interface Preset {
  name: string;
  label: string;
  tone: string;
  language: string;
  structure: {
    intro: string;
    sections: string;
    word_count: string;
    ending: string;
  };
  seo: {
    meta_description: boolean;
    keywords_count: string;
  };
  style: {
    emoji_level: string;
    sentence_ending: string;
    paragraph_length: string;
  };
  forbidden_patterns: string[];
}

export function loadPreset(tab: Tab): Preset {
  const filePath = path.join(__dirname, `${tab}.yaml`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseYaml(raw);
}

function parseYaml(raw: string): Preset {
  const result: Record<string, any> = {};
  let currentSection = '';

  for (const line of raw.split('\n')) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    if (indent === 0 && trimmed.includes(':')) {
      const [key, ...rest] = trimmed.split(':');
      const value = rest.join(':').trim();
      if (value && !value.startsWith('{')) {
        result[key.trim()] = value.replace(/^["']|["']$/g, '');
      } else {
        currentSection = key.trim();
        result[currentSection] = {};
      }
    } else if (indent >= 2 && currentSection) {
      const cleaned = trimmed.trim();
      if (cleaned.startsWith('- ')) {
        if (!Array.isArray(result[currentSection])) {
          result[currentSection] = [];
        }
        (result[currentSection] as string[]).push(cleaned.slice(2).replace(/^["']|["']$/g, ''));
      } else if (cleaned.includes(':')) {
        const [key, ...rest] = cleaned.split(':');
        const value = rest.join(':').trim().replace(/^["']|["']$/g, '');
        if (typeof result[currentSection] === 'object' && !Array.isArray(result[currentSection])) {
          result[currentSection][key.trim()] = value === 'true' ? true : value === 'false' ? false : value;
        }
      }
    }
  }

  return result as unknown as Preset;
}

export function presetToSystemPrompt(preset: Preset): string {
  return `당신은 "${preset.label}" 카테고리의 블로그 글을 작성하는 전문 작가입니다.

톤: ${preset.tone}
언어: 한국어
구조:
- 도입: ${preset.structure.intro}
- 섹션 수: ${preset.structure.sections}개
- 분량: ${preset.structure.word_count}자
- 마무리: ${preset.structure.ending}

스타일:
- 이모지: ${preset.style.emoji_level}
- 문체: ${preset.style.sentence_ending}
- 문단 길이: ${preset.style.paragraph_length}

SEO:
- 메타 설명 포함: ${preset.seo.meta_description ? '예' : '아니오'}
- 키워드 수: ${preset.seo.keywords_count}개

절대 사용 금지 표현: ${preset.forbidden_patterns.join(', ')}

출력 형식:
- 마크다운으로 작성
- 첫 줄은 "# 제목" 형식
- 각 섹션은 "## 소제목" 형식
- 본문만 출력 (설명, 주석 없음)`;
}
```

- [ ] **Step 2: 5개 YAML 프리셋 파일 작성**

`lib/ai/presets/health.yaml`:

```yaml
name: health
label: "건강/생활"
tone: "친근하고 실용적인 정보 전달, 전문가가 쉽게 설명하듯"
language: ko
structure:
  intro: "놀라운 통계 또는 일상 속 공감 질문으로 시작"
  sections: "3-4"
  word_count: "1000-1500"
  ending: "오늘부터 실천할 수 있는 팁 3가지 요약"
seo:
  meta_description: true
  keywords_count: "5-8"
style:
  emoji_level: "minimal"
  sentence_ending: "mixed"
  paragraph_length: "medium"
forbidden_patterns:
  - "혁신적인"
  - "획기적인"
  - "원활한"
  - "놀라운 효과"
  - "반드시 알아야 할"
```

`lib/ai/presets/finance.yaml`:

```yaml
name: finance
label: "재테크/경제"
tone: "신뢰감 있고 데이터 기반, 쉬운 경제 해설"
language: ko
structure:
  intro: "오늘의 핵심 경제 지표나 뉴스로 시작"
  sections: "3-4"
  word_count: "1000-1500"
  ending: "투자자/소비자가 알아야 할 핵심 포인트 정리"
seo:
  meta_description: true
  keywords_count: "5-8"
style:
  emoji_level: "none"
  sentence_ending: "mixed"
  paragraph_length: "medium"
forbidden_patterns:
  - "혁신적인"
  - "획기적인"
  - "대박"
  - "폭등"
  - "무조건"
```

`lib/ai/presets/tech.yaml`:

```yaml
name: tech
label: "테크/AI"
tone: "개발자가 동료에게 설명하듯, 기술적이지만 접근 가능"
language: ko
structure:
  intro: "주요 기술 뉴스 훅 또는 트렌드 요약으로 시작"
  sections: "3-5"
  word_count: "1000-1500"
  ending: "개발자가 관심 가질 만한 시사점 정리"
seo:
  meta_description: true
  keywords_count: "5-8"
style:
  emoji_level: "none"
  sentence_ending: "casual"
  paragraph_length: "short"
forbidden_patterns:
  - "혁신적인"
  - "획기적인"
  - "패러다임 전환"
  - "게임체인저"
```

`lib/ai/presets/devlog.yaml`:

```yaml
name: devlog
label: "개발일지"
tone: "솔직한 1인칭, 빌드인퍼블릭 스타일"
language: ko
structure:
  intro: "오늘 뭘 했는지 한 줄 요약"
  sections: "2-3"
  word_count: "500-800"
  ending: "내일 할 일 또는 배운 점"
seo:
  meta_description: true
  keywords_count: "3-5"
style:
  emoji_level: "none"
  sentence_ending: "casual"
  paragraph_length: "short"
forbidden_patterns:
  - "혁신적인"
  - "획기적인"
```

`lib/ai/presets/trending.yaml`:

```yaml
name: trending
label: "핫토픽"
tone: "빠르고 흥미로운 이슈 브리핑, 팩트 중심"
language: ko
structure:
  intro: "가장 핫한 이슈 한 줄 훅으로 시작"
  sections: "3-5"
  word_count: "1000-1500"
  ending: "왜 이게 중요한지 한 줄 관점"
seo:
  meta_description: true
  keywords_count: "5-8"
style:
  emoji_level: "minimal"
  sentence_ending: "mixed"
  paragraph_length: "short"
forbidden_patterns:
  - "혁신적인"
  - "획기적인"
  - "충격"
  - "경악"
  - "소름"
```

- [ ] **Step 3: 프리셋 로드 테스트**

```bash
cd /Users/labo/My_vault/dailybloglabo
npx tsx -e "
const { loadPreset, presetToSystemPrompt } = require('./lib/ai/presets/loader');
const p = loadPreset('health');
console.log('Loaded:', p.name, p.label);
console.log('System prompt preview:', presetToSystemPrompt(p).slice(0, 200));
"
```

Expected: `Loaded: health 건강/생활` + 시스템 프롬프트 미리보기

- [ ] **Step 4: 커밋**

```bash
git add lib/ai/presets/
git commit -m "feat: 탭별 스타일 프리셋 YAML 5개 + 로더"
```

---

### Task 4: 데이터 소스 교체

**Files:**
- Create: `lib/sources/health.ts`
- Create: `lib/sources/finance.ts`
- Create: `lib/sources/tech.ts`
- Modify: `lib/sources/trending.ts` (기존 유지, 타입만 업데이트)
- Modify: `lib/sources/github.ts` (기존 유지)
- Delete: `lib/sources/ai-news.ts`
- Delete: `lib/sources/crypto.ts`
- Delete: `lib/sources/stocks.ts`
- Create: `lib/ai/researcher.ts`

- [ ] **Step 1: 웹 리서치 에이전트 작성**

`lib/ai/researcher.ts` — Claude CLI의 WebSearch 도구를 활용한 리서치:

```typescript
import { callClaudeWithRetry } from './claude-cli';
import type { Tab } from '@/lib/types';

export interface ResearchResult {
  topics: Array<{
    title: string;
    summary: string;
    source?: string;
    keyData?: string;
  }>;
  rawResponse: string;
}

const RESEARCH_QUERIES: Record<Exclude<Tab, 'devlog'>, string> = {
  health: '오늘 건강/웰빙/생활습관 관련 최신 뉴스와 트렌드를 검색해서 블로그 글감 3-5개를 찾아줘. 각각 제목, 핵심 내용 요약(2-3문장), 출처를 정리해.',
  finance: '오늘 한국 경제/재테크/금융 관련 주요 뉴스를 검색해서 블로그 글감 3-5개를 찾아줘. 환율, 금리, 부동산, 주식 등 포함. 각각 제목, 핵심 내용, 수치 데이터, 출처를 정리해.',
  tech: '오늘 AI/테크/스타트업 관련 최신 뉴스를 검색해서 블로그 글감 3-5개를 찾아줘. 해외 뉴스도 포함. 각각 제목, 핵심 내용, 출처를 정리해.',
  trending: '오늘 한국에서 가장 화제인 이슈/트렌드를 검색해서 3-5개를 찾아줘. 소셜미디어, 뉴스 모두 포함. 각각 제목, 왜 화제인지 요약, 출처를 정리해.',
};

export async function research(tab: Tab): Promise<ResearchResult> {
  if (tab === 'devlog') {
    return { topics: [], rawResponse: '' };
  }

  const query = RESEARCH_QUERIES[tab];
  const today = new Date().toISOString().split('T')[0];

  const result = await callClaudeWithRetry({
    systemPrompt: `너는 블로그 글감을 찾는 리서치 에이전트야. 오늘 날짜는 ${today}이야. 반드시 웹 검색을 해서 최신 정보를 찾아. JSON 배열로만 응답해. 형식: [{"title":"제목","summary":"요약","source":"출처URL","keyData":"핵심 수치/데이터"}]`,
    message: query,
    timeout: 60000,
  });

  let topics: ResearchResult['topics'] = [];
  try {
    const jsonMatch = result.response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      topics = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error('[researcher] JSON 파싱 실패, raw 응답 사용');
  }

  return { topics, rawResponse: result.response };
}
```

- [ ] **Step 2: 탭별 소스 파일 작성**

`lib/sources/health.ts`:

```typescript
import { research } from '../ai/researcher';

export async function fetchHealthData() {
  const result = await research('health');
  return {
    topics: result.topics,
    raw: result.rawResponse,
  };
}
```

`lib/sources/finance.ts`:

```typescript
import { research } from '../ai/researcher';

export async function fetchFinanceData() {
  const result = await research('finance');
  return {
    topics: result.topics,
    raw: result.rawResponse,
  };
}
```

`lib/sources/tech.ts`:

```typescript
import { research } from '../ai/researcher';

export async function fetchTechData() {
  const result = await research('tech');
  return {
    topics: result.topics,
    raw: result.rawResponse,
  };
}
```

- [ ] **Step 3: 기존 소스 파일 삭제**

```bash
rm lib/sources/ai-news.ts lib/sources/crypto.ts lib/sources/stocks.ts
```

`lib/sources/trending.ts`와 `lib/sources/github.ts`는 유지. `trending.ts`의 타입만 새 types.ts에 맞게 조정 (기존 TrendingData 타입이 이미 호환됨).

- [ ] **Step 4: 기존 프롬프트 파일 삭제**

```bash
rm lib/ai/prompts/ai-news.ts lib/ai/prompts/crypto.ts lib/ai/prompts/stocks.ts lib/ai/prompts/hot-topics.ts
```

`lib/ai/prompts/devlog.ts`는 유지.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 웹 리서치 에이전트 + 탭별 데이터 소스 교체"
```

---

### Task 5: NanoBanana 이미지 생성

**Files:**
- Modify: `lib/ai/image-gen.ts` (전면 교체)

- [ ] **Step 1: NanoBanana API 연동으로 image-gen.ts 교체**

```typescript
import fs from 'fs';
import path from 'path';
import type { Tab } from '@/lib/types';

const NANOBANANA_API_KEY = process.env.NANOBANANA_API_KEY;
const NANOBANANA_URL = 'https://api.nanobanana.com/v1/images/generate';

export async function generateCoverImage(
  tab: Tab,
  title: string,
  date: string,
  imagePrompt: string,
): Promise<string> {
  if (!NANOBANANA_API_KEY) {
    console.log('[image-gen] NANOBANANA_API_KEY 없음, 이미지 건너뜀');
    return '';
  }

  if (!imagePrompt) {
    console.log('[image-gen] 이미지 프롬프트 없음, 건너뜀');
    return '';
  }

  const prompt = `${imagePrompt}, no text, no letters, no words, no numbers, no signs, no charts`;

  try {
    const response = await fetch(NANOBANANA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        model: 'gemini-2.5-flash-image',
        aspect_ratio: '16:9',
        num_images: 1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[image-gen] API 에러 ${response.status}: ${errText.slice(0, 200)}`);
      return '';
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url || data.url || data.image_url;
    if (!imageUrl) {
      console.log('[image-gen] 응답에 이미지 URL 없음');
      return '';
    }

    const imgResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    const dir = path.join(process.cwd(), 'public', 'images', 'posts', tab);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${date}.png`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`[image-gen] 이미지 저장: ${filepath}`);
    return `/images/posts/${tab}/${filename}`;
  } catch (err) {
    console.error('[image-gen] 실패:', err);
    return '';
  }
}
```

> **Note:** NanoBanana API 엔드포인트와 응답 형식은 실제 문서 확인 후 조정 필요. 위 코드는 일반적인 이미지 생성 API 패턴으로 작성. 실제 연동 시 `NANOBANANA_URL`, 요청 body, 응답 파싱을 API 문서에 맞게 수정.

- [ ] **Step 2: .env.local에 키 추가**

`.env.local`에 추가:
```
NANOBANANA_API_KEY=여기에_키_입력
```

- [ ] **Step 3: 커밋**

```bash
git add lib/ai/image-gen.ts
git commit -m "feat: NanoBanana(Gemini) 이미지 생성으로 교체"
```

---

### Task 6: 파이프라인 재구성

**Files:**
- Modify: `lib/pipeline.ts` (전면 재작성)
- Modify: `scripts/generate.ts` (탭 목록 변경)
- Delete: `lib/ai/claude.ts` (이제 claude-cli.ts로 대체)

- [ ] **Step 1: lib/pipeline.ts 재작성**

```typescript
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

interface PipelineResult {
  tab: Tab;
  date: string;
  filePath: string;
  imagePath: string;
  title: string;
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
    timeout: 120000,
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

  const imgPromptResult = await callClaudeWithRetry({
    systemPrompt: `기사 내용을 바탕으로 블로그 커버 이미지 프롬프트를 영어로 생성해. 60단어 이내. 사실적 사진 스타일. 텍스트/차트/그래프 절대 포함하지 마. 프롬프트만 출력.`,
    message: body.slice(0, 1500),
    timeout: 30000,
  });

  if (imgPromptResult.response) {
    imagePath = await generateCoverImage(tab, title, date, imgPromptResult.response);
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
  return { tab, date, filePath, imagePath, title };
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
```

- [ ] **Step 2: scripts/generate.ts 수정**

```typescript
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
```

- [ ] **Step 3: 기존 claude.ts 삭제 + 사용되지 않는 프롬프트 정리**

```bash
rm lib/ai/claude.ts
```

`lib/ai/prompts/devlog.ts`는 유지.

- [ ] **Step 4: 단일 탭 테스트**

```bash
cd /Users/labo/My_vault/dailybloglabo
npx tsx scripts/generate.ts --tab=health
```

Expected: `content/posts/health/2026-04-08.mdx` 파일 생성, 글 내용 확인

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 파이프라인 v2 재구성 (CLI spawn, 프리셋, 리서치)"
```

---

### Task 7: 로컬 전체 탭 테스트

**Files:** 없음 (테스트만)

- [ ] **Step 1: 전체 탭 생성 테스트**

```bash
cd /Users/labo/My_vault/dailybloglabo
npx tsx scripts/generate.ts --all
```

Expected: 5개 탭 모두 성공, `content/posts/` 아래 각 탭 폴더에 `.mdx` 파일 생성

- [ ] **Step 2: 로컬 서버에서 확인**

```bash
PORT=3007 npm run dev
```

브라우저에서 `http://localhost:3007` 접속. 5개 탭에 포스트가 보이는지 확인.

- [ ] **Step 3: 빌드 테스트**

```bash
npm run build
```

Expected: 빌드 성공

- [ ] **Step 4: 커밋 (생성된 포스트 포함)**

```bash
git add -A
git commit -m "test: v2 첫 포스트 5개 탭 생성 완료"
```

---

### Task 8: 멀티플랫폼 발행 — 티스토리

**Files:**
- Create: `lib/publish/tistory.ts`
- Create: `lib/publish/index.ts`
- Create: `lib/publish/markdown-to-html.ts`

- [ ] **Step 1: 마크다운 → HTML 변환기 작성**

`lib/publish/markdown-to-html.ts`:

```typescript
export function markdownToHtml(md: string): string {
  let html = md;

  // 제목
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 볼드, 이탤릭
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 링크
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // 이미지
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />');

  // 리스트
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.+<\/li>\n?)+/g, '<ul>$&</ul>');

  // 문단
  html = html.replace(/\n{2,}/g, '</p>\n<p>');
  html = `<p>${html}</p>`;

  // 정리
  html = html.replace(/<p><h([1-3])>/g, '<h$1>');
  html = html.replace(/<\/h([1-3])><\/p>/g, '</h$1>');
  html = html.replace(/<p><ul>/g, '<ul>');
  html = html.replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}
```

- [ ] **Step 2: 티스토리 발행 모듈 작성**

`lib/publish/tistory.ts`:

```typescript
import { markdownToHtml } from './markdown-to-html';

const TISTORY_API = 'https://www.tistory.com/apis/post/write';

interface TistoryPublishOpts {
  title: string;
  content: string;  // markdown
  tags?: string[];
  category?: string;
}

export async function publishTistory(opts: TistoryPublishOpts): Promise<{ postId: string; url: string }> {
  const accessToken = process.env.TISTORY_ACCESS_TOKEN;
  const blogName = process.env.TISTORY_BLOG_NAME;

  if (!accessToken || !blogName) {
    throw new Error('TISTORY_ACCESS_TOKEN 또는 TISTORY_BLOG_NAME 미설정');
  }

  const htmlContent = markdownToHtml(opts.content);

  const params = new URLSearchParams({
    access_token: accessToken,
    output: 'json',
    blogName,
    title: opts.title,
    content: htmlContent,
    visibility: '3',  // 공개
    category: opts.category || '0',
    tag: (opts.tags || []).join(','),
  });

  const response = await fetch(TISTORY_API, {
    method: 'POST',
    body: params,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`티스토리 API 에러 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const postId = data.tistory?.postId || 'unknown';
  const url = data.tistory?.url || `https://${blogName}.tistory.com/${postId}`;

  console.log(`[tistory] 발행 완료: ${url}`);
  return { postId, url };
}
```

- [ ] **Step 3: 발행 오케스트레이터 작성**

`lib/publish/index.ts`:

```typescript
import { publishTistory } from './tistory';

interface PublishPayload {
  title: string;
  content: string;
  tags?: string[];
  tab: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

export async function publishAll(post: PublishPayload): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  // 티스토리
  if (process.env.TISTORY_ACCESS_TOKEN) {
    try {
      const { url } = await publishTistory({
        title: post.title,
        content: post.content,
        tags: post.tags,
      });
      results.push({ platform: 'tistory', success: true, url });
    } catch (err) {
      results.push({ platform: 'tistory', success: false, error: (err as Error).message });
    }
  }

  // 네이버 (Task 9에서 추가)

  return results;
}
```

- [ ] **Step 4: 커밋**

```bash
git add lib/publish/
git commit -m "feat: 티스토리 API 발행 모듈 추가"
```

---

### Task 9: 멀티플랫폼 발행 — 네이버 블로그

**Files:**
- Create: `lib/publish/naver.ts`
- Modify: `lib/publish/index.ts` (네이버 추가)

- [ ] **Step 1: 네이버 블로그 발행 모듈 작성**

`lib/publish/naver.ts`:

```typescript
import { markdownToHtml } from './markdown-to-html';

const NAVER_BLOG_API = 'https://openapi.naver.com/blog/writePost.json';

interface NaverPublishOpts {
  title: string;
  content: string;  // markdown
  tags?: string[];
}

export async function publishNaver(opts: NaverPublishOpts): Promise<{ url: string }> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 미설정');
  }

  const htmlContent = markdownToHtml(opts.content);

  const params = new URLSearchParams({
    title: opts.title,
    contents: htmlContent,
  });

  const response = await fetch(NAVER_BLOG_API, {
    method: 'POST',
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`네이버 API 에러 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const url = data.message?.result?.blogUrl || '';

  console.log(`[naver] 발행 완료: ${url}`);
  return { url };
}
```

> **Note:** 네이버 블로그 API는 2026년 기준 접근 방식이 달라졌을 수 있음. 실제 연동 시 네이버 개발자 센터에서 최신 API 문서 확인 필요. OAuth 2.0 인증 flow가 필요할 수 있음.

- [ ] **Step 2: lib/publish/index.ts에 네이버 추가**

`publishAll` 함수에 네이버 블록 추가:

```typescript
// 네이버
if (process.env.NAVER_CLIENT_ID) {
  try {
    const { url } = await publishNaver({
      title: post.title,
      content: post.content,
      tags: post.tags,
    });
    results.push({ platform: 'naver', success: true, url });
  } catch (err) {
    results.push({ platform: 'naver', success: false, error: (err as Error).message });
  }
}
```

`import { publishNaver } from './naver';` 추가.

- [ ] **Step 3: 커밋**

```bash
git add lib/publish/
git commit -m "feat: 네이버 블로그 API 발행 모듈 추가"
```

---

### Task 10: 파이프라인에 멀티플랫폼 발행 연결 + 텔레그램 알림

**Files:**
- Modify: `lib/pipeline.ts` (발행 단계 추가)
- Create: `lib/notify.ts`

- [ ] **Step 1: 텔레그램 알림 모듈 작성**

`lib/notify.ts`:

```typescript
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6936548761';

export async function sendTelegramNotify(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[telegram] 토큰 미설정, 알림 건너뜀');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('[telegram] 알림 실패:', err);
  }
}
```

- [ ] **Step 2: pipeline.ts에 발행 + 알림 단계 추가**

`runPipeline` 함수 끝에 추가 (MDX 저장 후):

```typescript
import { publishAll } from './publish';
import { sendTelegramNotify } from './notify';

// ... 기존 코드 ...

// Step 5: 멀티플랫폼 발행
console.log(`[pipeline] 멀티플랫폼 발행 중...`);
const publishResults = await publishAll({
  title,
  content: body,
  tags: [],
  tab,
});

for (const r of publishResults) {
  if (r.success) {
    console.log(`  [OK] ${r.platform}: ${r.url}`);
  } else {
    console.log(`  [FAIL] ${r.platform}: ${r.error}`);
  }
}

return { tab, date, filePath, imagePath, title, publishResults };
```

- [ ] **Step 3: scripts/generate.ts에 완료 알림 추가**

`--all` 실행 완료 후:

```typescript
import { sendTelegramNotify } from '../lib/notify';

// ... main 함수 끝에 추가 ...
const successCount = results.filter(r => r.status === 'fulfilled').length;
await sendTelegramNotify(
  `📝 *DailyBlogLabo* 자동 발행 완료\n\n` +
  `날짜: ${new Date().toISOString().split('T')[0]}\n` +
  `성공: ${successCount}/5 탭\n` +
  results.map((r, i) => {
    const tab = VALID_TABS[i];
    return r.status === 'fulfilled'
      ? `✅ ${tab}: ${(r as PromiseFulfilledResult<any>).value.title}`
      : `❌ ${tab}: ${(r as PromiseRejectedResult).reason}`;
  }).join('\n')
);
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: 파이프라인에 멀티플랫폼 발행 + 텔레그램 알림 연결"
```

---

### Task 11: 크론잡 등록 + 최종 테스트

**Files:** 없음 (시스템 설정)

- [ ] **Step 1: 크론잡 등록**

```bash
crontab -e
```

추가:
```
# DailyBlogLabo v2 — 매일 08:00 발행
0 8 * * * cd /Users/labo/My_vault/dailybloglabo && /usr/local/bin/npx tsx scripts/generate.ts --all >> /tmp/dailybloglabo.log 2>&1
```

- [ ] **Step 2: 수동 전체 실행 테스트**

```bash
cd /Users/labo/My_vault/dailybloglabo
npx tsx scripts/generate.ts --all 2>&1 | tee /tmp/dailybloglabo-test.log
```

Expected:
- 5개 탭 모두 포스트 생성
- 이미지 생성 (NanoBanana 키 있을 경우)
- 티스토리/네이버 발행 (토큰 있을 경우, 없으면 건너뜀)
- 텔레그램 알림 수신

- [ ] **Step 3: Vercel 배포 확인**

```bash
cd /Users/labo/My_vault/dailybloglabo
git push
```

`https://dailybloglabo.vercel.app`에서 새 포스트 확인.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: 크론잡 등록 + v2 최종 테스트 완료"
```
