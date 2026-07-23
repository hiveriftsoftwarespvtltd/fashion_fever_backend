import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DocumentService } from 'src/document/document.service';
import { UserRole } from 'src/user/schema/user.schema';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class AdminCleanupService {
    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly documentService: DocumentService,
    ) { }

    // async wipeAllData() {
    //     try {
    //         // 1. Find and delete all media files using DocumentService
    //         const mediaModel = this.connection.model('Media');
    //         const allMedia = await mediaModel.find({});

    //         for (const media of allMedia) {
    //             try {
    //                 await this.documentService.deleteMedia(media._id.toString());
    //             } catch (error) {
    //                 console.error(`Failed to delete media ${media._id}:`, error);
    //             }
    //         }

    //         // 2. Clear all collections, excluding admin user
    //         const collections = this.connection.collections;
    //         for (const collectionName in collections) {
    //             const collection = collections[collectionName];
    //             if (collection.collectionName === 'users') {
    //                 // Keep the admin user
    //                 await collection.deleteMany({ role: { $ne: UserRole.ADMIN } });
    //             } else if (collection.collectionName !== 'media') {
    //                 // Media collection is already cleared by documentService.deleteMedia, 
    //                 // but we can double clear it safely if any orphaned docs exist
    //                 await collection.deleteMany({});
    //             }

    //             // Drop indexes (except _id index which MongoDB prevents from dropping)
    //             try {
    //                 await collection.dropIndexes();
    //             } catch (error: any) {
    //                 console.log(`Failed to drop indexes for ${collection.collectionName}:`, error.message);
    //             }
    //         }
    //         return ApiResponse.success('All data, media, and indexes wiped successfully, preserving admin users.', 200);
    //     } catch (error) {
    //         console.error('Wipe data failed:', error);
    //         throw error;
    //     }
    // }

    async wipeAllData(excludedCollections: string[] = []) {
        try {
            // Always preserve users (admin filtering logic)
            const protectedCollections = [
                'users',
                ...excludedCollections,
            ];

            // Delete media files first only if media is not excluded
            if (!protectedCollections.includes('media')) {
                const mediaModel = this.connection.model('Media');
                const allMedia = await mediaModel.find({});

                for (const media of allMedia) {
                    try {
                        await this.documentService.deleteMedia(media._id.toString());
                    } catch (error) {
                        console.error(`Failed to delete media ${media._id}:`, error);
                    }
                }
            }

            const collections = this.connection.collections;

            for (const collectionName in collections) {
                const collection = collections[collectionName];

                // Skip excluded collections
                if (protectedCollections.includes(collection.collectionName)) {
                    
                    continue;
                }

                await collection.deleteMany({});

                try {
                    await collection.dropIndexes();
                } catch (error: any) {
                    console.log(
                        `Failed to drop indexes for ${collection.collectionName}:`,
                        error.message,
                    );
                }
            }

            // Handle users separately (keep admins)
            if (!excludedCollections.includes('users')) {
                await collections.users.deleteMany({
                    role: { $ne: UserRole.ADMIN },
                });
            }

            return ApiResponse.success(
                'All data wiped successfully while preserving excluded collections.',
                200,
            );
        } catch (error) {
            console.error('Wipe data failed:', error);
            throw error;
        }
    }
}
