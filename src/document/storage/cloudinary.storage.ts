// src/media/storage/cloudinary.storage.ts

import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { StorageProvider, UploadResult } from './storage.interface';



export class CloudinaryStorage implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private getResourceType(mime: string): 'image' | 'video' | 'raw' {
    if (mime.startsWith('image')) return 'image';
    if (mime.startsWith('video')) return 'video';
    return 'raw'; // pdf, docs, etc
  }

  async upload(
    file: any,
    folder: string,
  ): Promise<UploadResult> {
    const resourceType = this.getResourceType(file.mimetype);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType, // ✅ FIXED
        },
        (error, result) => {
          if (error || !result) {
            console.error("🔥 CLOUDINARY ERROR:", error);
            return reject(error);
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            mimeType: file.mimetype,
            size: file.size,
            originalName: file.originalname,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  }

  async delete(publicId: string, resourceType?: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'image', // Use the provided type or default to 'image'
    });
  }
}