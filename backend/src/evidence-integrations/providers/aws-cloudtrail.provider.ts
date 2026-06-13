import AWS from 'aws-sdk';
import { EvidenceItem } from './github.provider';

export interface AwsCloudTrailConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  trailArn?: string;
}

export async function fetchAwsCloudTrailEvents(config: AwsCloudTrailConfig): Promise<EvidenceItem[]> {
  const { accessKeyId, secretAccessKey, region } = config;

  AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region,
  });

  const cloudtrail = new AWS.CloudTrail({ region });

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const result = await cloudtrail
      .lookupEvents({
        StartTime: startTime,
        EndTime: endTime,
        MaxResults: 50,
      })
      .promise();

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
