import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Media, MediaSchema } from './schema/document.schema';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StorageFactory } from './storage/storage.factory';
import { CloudinaryStorage } from './storage/cloudinary.storage';
import { LocalStorage } from './storage/local.storage';

@Module({
  imports:[MongooseModule.forFeature([{name:Media.name,schema:MediaSchema}]),MulterModule.register({storage:memoryStorage()})],
  providers: [DocumentService,CloudinaryStorage,LocalStorage,StorageFactory],
  controllers: [DocumentController],
  exports:[DocumentService,StorageFactory]
})
export class DocumentModule {}
