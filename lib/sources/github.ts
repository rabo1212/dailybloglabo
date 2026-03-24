import type { GitHubEvent } from '@/lib/types';

const TIMEOUT = 2000;

interface GitHubActivity {
  commits: { repo: string; message: string; date: string }[];
  issues: { repo: string; title: string; action: string; date: string }[];
  prs: { repo: string; title: string; action: string; date: string }[];
  raw: GitHubEvent[];
}

function mockData(): GitHubActivity {
  const now = new Date().toISOString();
  return {
    commits: [
      { repo: 'rabo1212/dailybloglabo', message: 'feat: add data source clients', date: now },
      { repo: 'rabo1212/mission-control', message: 'fix: dashboard layout on mobile', date: now },
    ],
    issues: [
      { repo: 'rabo1212/dailybloglabo', title: 'Set up CI pipeline', action: 'opened', date: now },
    ],
    prs: [
      { repo: 'rabo1212/dailybloglabo', title: 'Add trending data source', action: 'opened', date: now },
    ],
    raw: [],
  };
}

export async function fetchGitHubActivity(): Promise<GitHubActivity> {
  const username = process.env.GITHUB_USERNAME || 'rabo1212';

  try {
    const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=50`, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'dailybloglabo' },
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!res.ok) return mockData();

    const events: GitHubEvent[] = await res.json();

    const commits: GitHubActivity['commits'] = [];
    const issues: GitHubActivity['issues'] = [];
    const prs: GitHubActivity['prs'] = [];

    for (const ev of events) {
      const payload = ev.payload as Record<string, unknown>;

      if (ev.type === 'PushEvent') {
        const eventCommits = (payload.commits as { message: string }[]) || [];
        for (const c of eventCommits) {
          commits.push({ repo: ev.repo.name, message: c.message, date: ev.created_at });
        }
      } else if (ev.type === 'IssuesEvent') {
        const issue = payload.issue as { title: string } | undefined;
        if (issue) {
          issues.push({
            repo: ev.repo.name,
            title: issue.title,
            action: payload.action as string,
            date: ev.created_at,
          });
        }
      } else if (ev.type === 'PullRequestEvent') {
        const pr = payload.pull_request as { title: string } | undefined;
        if (pr) {
          prs.push({
            repo: ev.repo.name,
            title: pr.title,
            action: payload.action as string,
            date: ev.created_at,
          });
        }
      }
    }

    return { commits, issues, prs, raw: events };
  } catch {
    return mockData();
  }
}
