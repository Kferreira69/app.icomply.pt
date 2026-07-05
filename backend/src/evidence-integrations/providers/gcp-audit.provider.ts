import { createSign } from 'crypto';
import { Injectable } from '@nestjs/common';
import { EvidenceItem } from './github.provider';

export interface GcpAuditConfig {
  projectId: string;
  serviceAccountJson: string; // JSON string of service account key
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function base64urlEncode(value: string | Buffer): string {
  const buf = typeof value === 'string' ? Buffer.from(value) : value;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function buildJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64urlEncode(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/logging.read',
    }),
  );

  const signingInput = `${header}.${payload}`;

  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();
  const signature = base64urlEncode(sign.sign(privateKey));

  return `${signingInput}.${signature}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = buildJwt(clientEmail, privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`GCP token request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('GCP token response missing access_token');
  }

  return data.access_token as string;
}

async function fetchLogEntries(projectId: string, accessToken: string): Promise<any[]> {
  const response = await fetch('https://logging.googleapis.com/v2/entries:list', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceNames: [`projects/${projectId}`],
      filter: 'protoPayload.@type="type.googleapis.com/google.cloud.audit.AuditLog"',
      pageSize: 100,
      orderBy: 'timestamp desc',
    }),
  });

  if (!response.ok) {
    throw new Error(`GCP Logging API request failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.entries) ? data.entries : [];
}

function mapEntryToEvidenceItem(entry: any, projectId: string): EvidenceItem {
  const proto = entry.protoPayload ?? {};
  const methodName: string = proto.methodName ?? 'unknown';
  const serviceName: string = proto.serviceName ?? 'unknown';
  const principalEmail: string = proto.authenticationInfo?.principalEmail ?? 'unknown';
  const resourceName: string = proto.resourceName ?? '';
  const timestamp: Date = entry.timestamp ? new Date(entry.timestamp) : new Date();

  return {
    title: `GCP Audit: ${methodName}`,
    description: `Method: ${methodName} | Service: ${serviceName} | Principal: ${principalEmail}${resourceName ? ` | Resource: ${resourceName}` : ''}`,
    source: `gcp-audit:${projectId}`,
    collectedAt: timestamp,
    metadata: {
      logName: entry.logName,
      severity: entry.severity,
      methodName,
      serviceName,
      principalEmail,
      resourceName,
      requestMetadata: proto.requestMetadata,
      status: proto.status,
      insertId: entry.insertId,
    },
  };
}

@Injectable()
export class GcpAuditProvider {
  async collect(config: GcpAuditConfig): Promise<EvidenceItem[]> {
    try {
      const { projectId, serviceAccountJson } = config;

      let saKey: ServiceAccountKey;
      try {
        saKey = JSON.parse(serviceAccountJson) as ServiceAccountKey;
      } catch {
        return [];
      }

      const { client_email, private_key } = saKey;
      if (!client_email || !private_key) {
        return [];
      }

      const accessToken = await getAccessToken(client_email, private_key);
      const entries = await fetchLogEntries(projectId, accessToken);

      return entries.map((entry) => mapEntryToEvidenceItem(entry, projectId));
    } catch {
      return [];
    }
  }
}
