import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly useS3: boolean;
  private readonly localUploadDir: string;
  private s3?: any;
  private bucket?: string;

  constructor(private config: ConfigService) {
    const s3Endpoint = this.config.get<string>('S3_ENDPOINT', '');
    const s3AccessKey = this.config.get<string>('S3_ACCESS_KEY', '');
    const s3SecretKey = this.config.get<string>('S3_SECRET_KEY', '');

    // Use S3 only when all credentials are provided
    this.useS3 = !!(s3AccessKey && s3SecretKey);

    if (this.useS3) {
      // Lazy-load AWS SDK to avoid crashes when not installed
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AWS = require('aws-sdk');
        this.bucket = this.config.get<string>('S3_BUCKET', 'icomply-evidence');
        this.s3 = new AWS.S3({
          endpoint: s3Endpoint || undefined,
          accessKeyId: s3AccessKey,
          secretAccessKey: s3SecretKey,
          region: this.config.get<string>('S3_REGION', 'eu-west-1'),
          s3ForcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        });
      } catch {
        console.warn('[StorageService] aws-sdk not available, falling back to local storage');
        this.useS3 = false;
      }
    }

    // Local upload directory (used when S3 is not configured)
    this.localUploadDir = this.config.get<string>(
      'LOCAL_UPLOAD_DIR',
      path.join(process.cwd(), 'uploads'),
    );

    if (!this.useS3) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
      console.log(`[StorageService] Using local file storage at: ${this.localUploadDir}`);
    }
  }

  async onModuleInit() {
    if (this.useS3) await this.ensureBucket();
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'evidence',
  ): Promise<{ key: string; url: string; size: number }> {
    const ext = (originalName.split('.').pop() || 'bin').toLowerCase();
    const key = `${folder}/${uuid()}.${ext}`;

    if (this.useS3 && this.s3) {
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

    // Local filesystem storage
    const localPath = path.join(this.localUploadDir, key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    const url = `${appUrl}/api/v1/uploads/${key}`;
    return { key, url, size: buffer.length };
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useS3 && this.s3) {
      return this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      });
    }

    // For local storage return a direct URL
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    return `${appUrl}/api/v1/uploads/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    if (this.useS3 && this.s3) {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key,
      }).promise();
      return;
    }

    const localPath = path.join(this.localUploadDir, key);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }

  async ensureBucket(): Promise<void> {
    if (!this.useS3 || !this.s3) return;
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
    } catch {
      await this.s3.createBucket({ Bucket: this.bucket }).promise();
    }
  }

  /** Read a locally stored file (used for serving uploads without S3) */
  readLocalFile(key: string): Buffer | null {
    if (this.useS3) return null;
    const localPath = path.join(this.localUploadDir, key);
    if (!fs.existsSync(localPath)) return null;
    return fs.readFileSync(localPath);
  }

  /** Stream an S3/MinIO file through the backend (avoids exposing internal network URLs) */
  async readS3Buffer(key: string): Promise<Buffer | null> {
    if (!this.useS3 || !this.s3) return null;
    try {
      const obj = await this.s3.getObject({ Bucket: this.bucket!, Key: key }).promise();
      return obj.Body as Buffer;
    } catch (e) {
      console.error('[StorageService] S3 read failed:', e);
      return null;
    }
  }
}
