import {
  CloudTrailClient,
  LookupEventsCommand,
} from '@aws-sdk/client-cloudtrail';
import { EvidenceItem } from './github.provider';

export interface AwsCloudTrailConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  trailArn?: string;
}

export async function fetchAwsCloudTrailEvents(config: AwsCloudTrailConfig): Promise<EvidenceItem[]> {
  const { accessKeyId, secretAccessKey, region } = config;

  const client = new CloudTrailClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const result = await client.send(new LookupEventsCommand({
      StartTime: startTime,
      EndTime: endTime,
      MaxResults: 50,
    }));

    const events = result.Events ?? [];

    return events.map((event): EvidenceItem => ({
      title: `AWS CloudTrail: ${event.EventName ?? 'unknown'}`,
      description: `Event: ${event.EventName ?? 'unknown'} | Username: ${event.Username ?? 'unknown'} | Source: ${event.EventSource ?? 'unknown'}`,
      source: `aws-cloudtrail:${region}`,
      collectedAt: event.EventTime ?? new Date(),
      metadata: {
        eventId: event.EventId,
        eventName: event.EventName,
        eventSource: event.EventSource,
        username: event.Username,
        resources: event.Resources,
        cloudTrailEvent: event.CloudTrailEvent ? JSON.parse(event.CloudTrailEvent) : null,
      },
    }));
  } catch {
    return [];
  }
}
