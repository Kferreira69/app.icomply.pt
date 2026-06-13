import { EvidenceItem } from './github.provider';

export interface AzureAdConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

async function getAzureAccessToken(config: AzureAdConfig): Promise<string | null> {
  const { tenantId, clientId, clientSecret } = config;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchAzureAdAuditLogs(config: AzureAdConfig): Promise<EvidenceItem[]> {
  const token = await getAzureAccessToken(config);
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?$top=50',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const logs: any[] = data.value ?? [];

    return logs.map((log): EvidenceItem => ({
      title: `Azure AD Audit: ${log.activityDisplayName ?? 'unknown'}`,
      description: `Operation: ${log.operationType ?? 'unknown'} | Initiated by: ${log.initiatedBy?.user?.userPrincipalName ?? log.initiatedBy?.app?.displayName ?? 'unknown'} | Result: ${log.result ?? 'unknown'}`,
      source: `azure-ad:${config.tenantId}`,
      collectedAt: log.activityDateTime ? new Date(log.activityDateTime) : new Date(),
      metadata: log,
    }));
  } catch {
    return [];
  }
}
