import { Controller, Get, Param, Res } from '@nestjs/common';
import { DocumentService } from './document.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('file')
export class FileController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('get-file/:id')
  async getFile(@Param('id') id: string, @Res() res: any) {
    try {
      const media: any = await this.documentService.getMediaById(id);
      if (!media) {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }

      const getUploadDir = () => {
        if (process.env.UPLOAD_DIR && fs.existsSync(process.env.UPLOAD_DIR)) {
          return process.env.UPLOAD_DIR;
        }
        return path.join(process.cwd(), 'uploads');
      };

      const baseDir = getUploadDir();

      // Check by publicId
      if (media.publicId) {
        const filePath = path.join(baseDir, media.publicId);
        if (fs.existsSync(filePath)) {
          if (media.mimeType) {
            res.setHeader('Content-Type', media.mimeType);
          }
          return res.sendFile(filePath);
        }
      }

      // Check by url subpath
      if (media.url) {
        const urlParts = media.url.split('/uploads/');
        if (urlParts.length > 1) {
          const subPath = urlParts[1];
          const filePath = path.join(baseDir, subPath);
          if (fs.existsSync(filePath)) {
            if (media.mimeType) {
              res.setHeader('Content-Type', media.mimeType);
            }
            return res.sendFile(filePath);
          }
        }
      }

      // If remote URL, redirect
      if (media.url && (media.url.startsWith('http://') || media.url.startsWith('https://'))) {
        return res.redirect(media.url);
      }

      return res.status(404).json({ success: false, message: 'File not found on disk' });
    } catch (err) {
      console.error('Error serving file in FileController:', err);
      return res.status(500).json({ success: false, message: 'Internal server error while serving file' });
    }
  }
}
