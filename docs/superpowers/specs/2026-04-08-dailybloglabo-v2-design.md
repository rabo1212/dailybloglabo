# DailyBlogLabo v2 — 블로그 자동화 + 수익화 설계서

> 날짜: 2026-04-08
> 베이스: 기존 DailyBlogLabo (Next.js 14 + MDX, Vercel)
> 레퍼런스: GPTaku blog-writer 시스템

---

## 1. 목표

기존 DailyBlogLabo를 수익화 가능한 멀티플랫폼 블로그 자동화 시스템으로 재구성.
하루 5개 포스트를 자동 생성하고, 자체 블로그 + 티스토리 + 네이버에 동시 발행.

---

## 2. 탭 구성 (5개)

기존 탭(ai, crypto, stocks, hot, devlog)을 전면 교체.

| 탭 ID | 이름 | 수익 모델 | 데이터 소스 |
|--------|------|-----------|-------------|
| `health` | 건강/생활 | 애드센스 + 건강식품 제휴 | 웹 검색 (트렌드 키워드) |
| `finance` | 재테크/경제 | 애드센스 + 금융 제휴 | 웹 검색 + 환율/금리 API |
| `tech` | 테크/AI 트렌드 | 애드센스 | 웹 검색 + HN + Reddit |
| `devlog` | 개발일지 | 간접 (브랜드) | GitHub API (기존 유지) |
| `trending` | 핫토픽 | 애드센스 | Google Trends + Reddit + HN |

---

## 3. 아키텍처 변경점

### 3.1 기존 구조 (유지)

```
scripts/generate.ts  →  lib/pipeline.ts  →  데이터 수집 → Claude 생성 → MDX 저장
```

Next.js 프론트엔드, MDX 렌더링, Vercel 배포는 그대로 유지.

### 3.2 추가/변경

```
[기존 파이프라인]
  scripts/generate.ts
  lib/pipeline.ts
  lib/ai/claude.ts          ← Anthropic SDK 직접 호출
  lib/ai/image-gen.ts       ← Replicate/Fal.ai
  lib/sources/*             ← 데이터 수집

[v2 변경]
  scripts/generate.ts       ← 탭 목록 변경
  lib/pipeline.ts           ← Claude CLI spawn으로 교체 + 멀티플랫폼 발행 단계 추가
  lib/ai/claude-cli.ts      ★ 신규: Claude Code CLI spawn 방식
  lib/ai/image-gen.ts       ← NanoBanana(Gemini) API로 교체
  lib/ai/presets/            ★ 신규: 탭별 스타일 프리셋 YAML
  lib/ai/researcher.ts      ★ 신규: 웹 리서치 에이전트 (Claude CLI --allowedTools)
  lib/sources/health.ts     ★ 신규
  lib/sources/finance.ts    ★ 신규
  lib/sources/tech.ts       ★ 신규 (기존 ai-news.ts 확장)
  lib/sources/trending.ts   ← 기존 유지
  lib/sources/github.ts     ← 기존 유지
  lib/publish/              ★ 신규: 멀티플랫폼 발행
    tistory.ts              — 티스토리 API
    naver.ts                — 네이버 블로그 API
    index.ts                — 발행 오케스트레이터
  lib/types.ts              ← Tab 타입 변경
```

### 3.3 삭제

```
lib/sources/ai-news.ts     → tech.ts로 대체
lib/sources/crypto.ts       → 삭제
lib/sources/stocks.ts       → 삭제
lib/ai/prompts/ai-news.ts   → presets/로 대체
lib/ai/prompts/crypto.ts    → 삭제
lib/ai/prompts/stocks.ts    → 삭제
```

---

## 4. 핵심 모듈 설계

### 4.1 Claude CLI 엔진 (`lib/ai/claude-cli.ts`)

기존 `claude.ts`(Anthropic SDK 직접 호출)를 Claude Code CLI spawn 방식으로 교체.
ddeumi-slack의 session-manager.js와 동일한 패턴.

```typescript
interface CLIOptions {
  systemPrompt: string;
  message: string;
  timeout?: number;       // 기본 120초
  permissionMode?: string; // 기본 'bypassPermissions'
}

interface CLIResult {
  response: string;
  durationMs: number;
}

export async function callClaude(opts: CLIOptions): Promise<CLIResult>
```

- `/Users/labo/.local/bin/claude` spawn
- `-p --output-format stream-json --verbose` 플래그
- 세션 관리 없음 (포스트별 독립 호출, 상태 불필요)
- 120초 타임아웃, 실패 시 1회 재시도

### 4.2 스타일 프리셋 (`lib/ai/presets/`)

탭별 YAML 파일로 톤, 구조, SEO 규칙 정의.

```
presets/
  health.yaml
  finance.yaml
  tech.yaml
  devlog.yaml
  trending.yaml
```

각 프리셋 구조:

```yaml
name: health
label: "건강/생활"
tone: "친근하고 실용적인 정보 전달"
language: ko
structure:
  intro: "훅킹 질문 또는 놀라운 사실로 시작"
  sections: 3-4
  word_count: 1000-1500
  ending: "실천 가능한 팁 요약"
seo:
  meta_description: true
  keywords_count: 5-8
style:
  emoji_level: "moderate"     # none / minimal / moderate
  sentence_ending: "mixed"    # formal(~합니다) / casual(~해요) / mixed
  paragraph_length: "medium"  # short / medium / long
forbidden_patterns:
  - "혁신적인"
  - "획기적인"
  - "원활한"
```

### 4.3 웹 리서치 (`lib/ai/researcher.ts`)

각 탭별 트렌드 키워드를 웹 검색으로 수집. Claude CLI의 `--allowedTools` 옵션으로 WebSearch만 허용.

```typescript
export async function research(tab: Tab): Promise<ResearchResult> {
  // 1. 탭별 검색 키워드 생성 (오늘 날짜 기반)
  // 2. Claude CLI spawn with WebSearch 도구
  // 3. 검색 결과 파싱 → 상위 3-5개 주제 + 핵심 데이터 반환
}
```

- health: "오늘 건강 뉴스", 계절별 키워드 자동 추가
- finance: "오늘 경제 뉴스", 환율/금리 데이터
- tech: "AI 뉴스 오늘", "테크 트렌드" + HN/Reddit
- trending: Google Trends 기반

### 4.4 이미지 생성 (`lib/ai/image-gen.ts`)

기존 Replicate/Fal.ai → NanoBanana (Gemini `gemini-2.5-flash-image`) API로 교체.

```typescript
export async function generateCoverImage(
  tab: Tab,
  title: string,
  date: string,
  imagePrompt: string
): Promise<string>  // 저장된 이미지 경로 반환
```

- 포스트당 히어로 이미지 1장
- `public/images/{tab}/{date}.png` 저장
- NanoBanana API 키: `.env.local`의 `NANOBANANA_API_KEY`

### 4.5 멀티플랫폼 발행 (`lib/publish/`)

MDX 원본을 각 플랫폼 포맷으로 변환 후 발행.

```typescript
// lib/publish/index.ts
export async function publishAll(post: PublishPayload): Promise<PublishResult[]> {
  const results = await Promise.allSettled([
    publishTistory(post),
    publishNaver(post),
  ]);
  return results;
}
```

**티스토리 (`tistory.ts`)**
- OAuth 2.0 인증 (access_token)
- POST `/apis/post/write` — HTML 변환 후 발행
- 카테고리 매핑: 탭 → 티스토리 카테고리 ID
- API: `https://www.tistory.com/apis/post/write`

**네이버 블로그 (`naver.ts`)**
- 네이버 개발자 Open API
- 블로그 글쓰기 API (SmartEditor JSON 또는 HTML)
- 카테고리 매핑: 탭 → 네이버 카테고리
- API: `https://openapi.naver.com/blog/writePost.json`

**발행 순서:**
1. Vercel 자체 블로그 — MDX 커밋 → 자동 배포 (기존)
2. 티스토리 — API 발행 (HTML 변환)
3. 네이버 — API 발행 (HTML 변환)

---

## 5. 파이프라인 흐름

```
[크론잡: 매일 08:00 KST]
     │
     ▼
[탭 5개 순차 처리]
     │
     ├── 1. research(tab)        — 웹 검색으로 오늘의 주제 수집
     ├── 2. loadPreset(tab)      — 스타일 프리셋 YAML 로드
     ├── 3. callClaude(...)      — 글 생성 (CLI spawn)
     ├── 4. generateImage(...)   — 커버 이미지 (NanoBanana)
     ├── 5. saveMDX(...)         — MDX 파일 저장 (자체 블로그)
     └── 6. publishAll(...)      — 티스토리 + 네이버 동시 발행
     │
     ▼
[텔레그램 알림: 완료 보고]
```

탭 5개를 순차 처리하는 이유: CLI spawn 동시 5개는 리소스 과부하 위험.
예상 소요: 탭당 2-3분 × 5 = 10-15분.

---

## 6. 환경변수 (.env.local)

```
# 기존 유지
GITHUB_TOKEN=...
GITHUB_USERNAME=rabo1212

# 교체
# ANTHROPIC_API_KEY → 불필요 (CLI 구독 사용)
# FAL_KEY → 불필요 (NanoBanana 사용)
# REPLICATE_API_TOKEN → 불필요

# 신규
NANOBANANA_API_KEY=...

# 멀티플랫폼 발행
TISTORY_ACCESS_TOKEN=...
TISTORY_BLOG_NAME=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
NAVER_BLOG_ID=...

# 알림
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=6936548761
```

---

## 7. 크론잡

```
# DailyBlogLabo v2 — 매일 08:00 발행
0 8 * * * cd /Users/labo/My_vault/dailybloglabo && /usr/local/bin/node scripts/generate-v2.js >> /tmp/dailybloglabo.log 2>&1
```

기존 GitHub Actions 방식 대신 로컬 크론잡 사용 (CLI spawn은 로컬에서만 가능).

---

## 8. 프론트엔드 변경

### 8.1 types.ts

```typescript
export type Tab = 'health' | 'finance' | 'tech' | 'devlog' | 'trending';

export const TAB_CONFIG: Record<Tab, { label: string; color: string; colorClass: string }> = {
  health:   { label: '건강/생활',     color: '#34d399', colorClass: 'text-health' },
  finance:  { label: '재테크/경제',   color: '#fbbf24', colorClass: 'text-finance' },
  tech:     { label: '테크/AI',       color: '#22d3ee', colorClass: 'text-tech' },
  devlog:   { label: '개발일지',      color: '#a5a5ff', colorClass: 'text-devlog' },
  trending: { label: '핫토픽',        color: '#fb923c', colorClass: 'text-trending' },
};
```

### 8.2 기존 포스트 마이그레이션

- `content/posts/ai/` → 삭제 (2개뿐)
- `content/posts/crypto/`, `stocks/` → 빈 폴더, 삭제
- `content/posts/hot/` → `content/posts/trending/`으로 이동 (있다면)
- `content/posts/devlog/` → 유지

### 8.3 UI

탭 네비게이션, 색상, 레이블만 변경. 레이아웃/컴포넌트 구조는 기존 유지.
한국어 전용으로 전환 (lang 파라미터 제거, 모든 포스트 ko).

---

## 9. 구현 순서 (우선순위)

1. **탭/타입 변경** — types.ts, 프론트엔드 탭 교체, 기존 포스트 정리
2. **Claude CLI 엔진** — claude-cli.ts 구현, 기존 claude.ts 교체
3. **스타일 프리셋** — 5개 YAML 작성
4. **데이터 소스** — health.ts, finance.ts, tech.ts 구현
5. **NanoBanana 이미지** — image-gen.ts 교체
6. **파이프라인 통합** — pipeline.ts 재구성, 크론잡 등록
7. **로컬 테스트** — 탭별 1회씩 생성 테스트
8. **멀티플랫폼 발행** — 티스토리 API, 네이버 API 연동
9. **텔레그램 알림** — 완료/실패 알림

---

## 10. 비용 추정

| 항목 | 월 비용 |
|------|---------|
| Claude Code CLI | $0 (구독 포함) |
| NanoBanana 이미지 | 미정 (Gemini 무료 티어 확인 필요) |
| Vercel 호스팅 | $0 (무료 티어) |
| 티스토리 | $0 |
| 네이버 블로그 | $0 |
| GitHub API | $0 |
| **합계** | **~$0** (구독 내) |

---

## 11. 리스크

- **Claude CLI rate limit**: 하루 5회 호출이면 여유 있지만, 리서치 에이전트까지 합치면 10회. 모니터링 필요.
- **네이버 블로그 API**: 공식 글쓰기 API가 제한적일 수 있음. 실제 연동 시 확인 필요.
- **NanoBanana API**: 무료 티어 제한 확인 필요. 이미지 없이도 동작하도록 폴백 구현.
- **SEO 중복 콘텐츠**: 3개 플랫폼에 같은 글 → 각 플랫폼별 약간의 변형 또는 canonical URL 설정 필요.
