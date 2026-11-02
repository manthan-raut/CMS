import fs from 'fs';
import path from 'path';

// Placeholder for S3 implementation if we decide to use it
// import AWS from 'aws-sdk';

export class StorageService {
  private provider: 'local' | 's3';

  constructor() {
    this.provider = (process.env.STORAGE_PROVIDER as 'local' | 's3') || 'local';
  }

  async uploadFile(file: any): Promise<string> {
    if (this.provider === 'local') {
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `${Date.now()}-${file.originalname}`;
      const dest = path.join(uploadDir, filename);
      fs.writeFileSync(dest, file.buffer);
      return `/uploads/${filename}`;
    } else if (this.provider === 's3') {
      // Stub for S3
      console.log('Would upload to S3 here:', file.originalname);
      return `https://s3.amazonaws.com/dummy-bucket/${Date.now()}-${file.originalname}`;
    }
    throw new Error('Unsupported storage provider');
  }
}

export const storageService = new StorageService();
