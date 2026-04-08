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
  const result: Record<string, unknown> = {};
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
          (result[currentSection] as Record<string, unknown>)[key.trim()] = value === 'true' ? true : value === 'false' ? false : value;
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
