// // src/media/storage/local.storage.ts
// import { Express } from 'express';


// import * as fs from 'fs';
// import * as path from 'path';
// import { randomUUID } from 'crypto';
// import { StorageProvider, UploadResult } from './storage.interface';

// export class LocalStorage implements StorageProvider {
//   async upload(
//     file: any,
//     folder: string,
//   ): Promise<UploadResult> {
//     // const uploadDir = path.join(process.cwd(), 'uploads', folder);
//     const uploadDir =
//       process.env.NODE_ENV === 'production'
//         ? path.join('/var/www/uploads', folder)
//         : path.join(process.cwd(), 'uploads', folder);

//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }

//     const fileName = `${randomUUID()}-${file.originalname}`;
//     const filePath = path.join(uploadDir, fileName);

//     fs.writeFileSync(filePath, file.buffer);

//     return {
//       url: `/uploads/${folder}/${fileName}`,
//       publicId: `${folder}/${fileName}`, // 🔥 used for delete
//       mimeType: file.mimetype,
//       size: file.size,
//       originalName: file.originalname,
//     };
//   }

//   async delete(publicId: string, resourceType?: string): Promise<void> {
//     const filePath = path.join(process.cwd(), 'uploads', publicId);

//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }
//   }
// }

// src/media/storage/local.storage.ts

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageProvider, UploadResult } from './storage.interface';

export class LocalStorage implements StorageProvider {
  private getBaseUploadDir(): string {
    if (process.env.NODE_ENV === 'production') {
      if (process.env.UPLOAD_DIR) {
        if (!fs.existsSync(process.env.UPLOAD_DIR)) {
          try { fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true }); } catch (_) {}
        }
        if (fs.existsSync(process.env.UPLOAD_DIR)) {
          return process.env.UPLOAD_DIR;
        }
      }
      const userDir = '/home/fashionfever/uploads';
      if (!fs.existsSync(userDir)) {
        try { fs.mkdirSync(userDir, { recursive: true }); } catch (_) {}
      }
      if (fs.existsSync(userDir)) {
        return userDir;
      }
    }
    const localDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(localDir)) {
      try { fs.mkdirSync(localDir, { recursive: true }); } catch (_) {}
    }
    return localDir;
  }

  async upload(
    file: any,
    folder: string,
  ): Promise<UploadResult> {
    const baseUploadDir = this.getBaseUploadDir();
    const uploadDir = path.join(baseUploadDir, folder);

    // Create folder if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${randomUUID()}-${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.SERVER_BASE_URL
        : `http://localhost:${process.env.PORT}`;

    return {
      url: `${baseUrl}/uploads/${folder}/${fileName}`,
      publicId: `${folder}/${fileName}`,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    };
  }

  async delete(
    publicId: string,
    resourceType?: string,
  ): Promise<void> {
    const baseUploadDir = this.getBaseUploadDir();
    const filePath = path.join(baseUploadDir, publicId);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}