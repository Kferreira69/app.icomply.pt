export interface EvidenceItem {
  title: string;
  description: string;
  source: string;
  collectedAt: Date;
  metadata: any;
}

export interface GitHubConfig {
  token: string;
  org: string;
  limit?: number;
}

export async function fetchGitHubAuditLog(config: GitHubConfig): Promise<EvidenceItem[]> {
  const { token, org, limit = 100 } = config;

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/orgs/${encodeURIComponent(org)}/audit-log?per_page=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  } catch {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  let events: any[];
  try {
    events = await response.json();
  } catch {
    return [];
  }

  if (!Array.isArray(events)) {
    return [];
  }

  return events.map((event): EvidenceItem => ({
    title: `GitHub Audit: ${event.action ?? 'unknown'}`,
    description: `Actor: ${event.actor ?? 'unknown'} | Action: ${event.action ?? 'unknown'}${event.repo ? ` | Repo: ${event.repo}` : ''}`,
    source: `github:${org}`,
    collectedAt: event.created_at ? new Date(event.created_at) : new Date(),
    metadata: event,
  }));
}
