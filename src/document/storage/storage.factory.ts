// src/media/storage/storage.factory.ts

import { Injectable } from '@nestjs/common';
import { StorageProvider } from './storage.interface';
import { LocalStorage } from './local.storage';
import { CloudinaryStorage } from './cloudinary.storage';

@Injectable()
export class StorageFactory {
  private local = new LocalStorage();
  private cloudinary = new CloudinaryStorage();

  getStorage(type: string): StorageProvider {
    switch (type) {
      case 'local':
        return this.local;

      case 'cloudinary':
        return this.cloudinary;

      case 's3':
        throw new Error('S3 not implemented');

      default:
        throw new Error('Invalid storage type');
    }
  }
}