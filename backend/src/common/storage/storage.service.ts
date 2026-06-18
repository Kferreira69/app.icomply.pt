import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly useS3: boolean;
  private readonly localUploadDir: string;
  private s3?: S3Client;
  private bucket?: string;

  constructor(private config: ConfigService) {
    const s3Endpoint = this.config.get<string>('S3_ENDPOINT', '');
    const s3AccessKey = this.config.get<string>('S3_ACCESS_KEY', '');
    const s3SecretKey = this.config.get<string>('S3_SECRET_KEY', '');

    this.useS3 = !!(s3AccessKey && s3SecretKey);

    if (this.useS3) {
      this.bucket = this.config.get<string>('S3_BUCKET', 'icomply-evidence');
      this.s3 = new S3Client({
        endpoint: s3Endpoint || undefined,
        credentials: { accessKeyId: s3AccessKey, secretAccessKey: s3SecretKey },
        region: this.config.get<string>('S3_REGION', 'eu-west-1'),
        forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      });
    }

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
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: { originalName },
      }));
      const url = await this.getPresignedUrl(key);
      return { key, url, size: buffer.length };
    }

    const localPath = path.join(this.localUploadDir, key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    return { key, url: `${appUrl}/api/v1/uploads/${key}`, size: buffer.length };
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useS3 && this.s3) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
    }
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    return `${appUrl}/api/v1/uploads/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    if (this.useS3 && this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return;
    }
    const localPath = path.join(this.localUploadDir, key);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }

  async ensureBucket(): Promise<void> {
    if (!this.useS3 || !this.s3) return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  readLocalFile(key: string): Buffer | null {
    if (this.useS3) return null;
    const localPath = path.join(this.localUploadDir, key);
    if (!fs.existsSync(localPath)) return null;
    return fs.readFileSync(localPath);
  }

  async readS3Buffer(key: string): Promise<Buffer | null> {
    if (!this.useS3 || !this.s3) return null;
    try {
      const response = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket!, Key: key }),
      );
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (e) {
      console.error('[StorageService] S3 read failed:', e);
      return null;
    }
  }
}
