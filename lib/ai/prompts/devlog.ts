import type { Edition } from '@/lib/types';

interface DevlogEvents {
  commits: number;
  issues: number;
  prs: number;
  repos: string[];
  details: string;
}

export function devlogPrompt(edition: Edition, events: DevlogEvents): string {
  const repoList = events.repos.length > 0 ? events.repos.join(', ') : 'none';

  if (edition === 'am') {
    return `You are a developer writing a morning dev log for a personal tech blog.

Recap what happened overnight and lay out today's plan based on the following GitHub activity:
- Commits: ${events.commits}
- Issues opened/closed: ${events.issues}
- Pull requests: ${events.prs}
- Active repos: ${repoList}

Details:
${events.details}

Format:
## Overnight Recap
(What happened since yesterday evening)

## Today's Plan
(What's on the agenda based on open issues, PRs, and momentum)

## One Liner
(A single sentence capturing the dev mood)

Rules:
- Technical and specific. Reference actual repos, issue numbers, and commit themes.
- Under 500 words.
- No emojis.
- Write in a direct, personal tone. First person.`;
  }

  return `You are a developer writing an evening dev log for a personal tech blog.

Summarize today's accomplishments based on the following GitHub activity:
- Commits: ${events.commits}
- Issues opened/closed: ${events.issues}
- Pull requests: ${events.prs}
- Active repos: ${repoList}

Details:
${events.details}

Format:
## What Got Done
(Concrete accomplishments with specifics)

## Blockers & Detours
(Anything that slowed progress or changed direction)

## Tomorrow's Queue
(What carries over or comes next)

## One Liner
(A single sentence capturing the dev mood)

Rules:
- Technical and specific. Reference actual repos, issue numbers, and commit themes.
- Under 500 words.
- No emojis.
- Write in a direct, personal tone. First person.`;
}
