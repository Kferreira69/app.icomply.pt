import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService {
  private s3: AWS.S3;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', 'icomply-evidence');
    this.s3 = new AWS.S3({
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      accessKeyId: this.config.get<string>('S3_ACCESS_KEY'),
      secretAccessKey: this.config.get<string>('S3_SECRET_KEY'),
      region: this.config.get<string>('S3_REGION', 'eu-west-1'),
      s3ForcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
    });
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'evidence',
  ): Promise<{ key: string; url: string; size: number }> {
    const ext = originalName.split('.').pop();
    const key = `${folder}/${uuid()}.${ext}`;

    await this.s3.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: { originalName },
    }).promise();

    const url = await this.getPresignedUrl(key);
    return { key, url, size: buffer.length };
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    });
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: key,
    }).promise();
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
    } catch {
      await this.s3.createBucket({ Bucket: this.bucket }).promise();
    }
  }
}
