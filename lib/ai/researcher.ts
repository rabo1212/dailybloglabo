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
    timeout: 180000,
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
