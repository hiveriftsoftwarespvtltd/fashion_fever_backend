import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HomeBookingCard, HomeBookingCardDocument } from './schema/home-booking-cards.schema';
import { DocumentService } from 'src/document/document.service';
import { ApiResponse } from 'src/common/responses/api-response';

const defaultCardsData = [
  {
    category: 'BRIDAL MAKEUP',
    name: 'HD Bridal Makeup & Hair Styling',
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=600&fit=crop',
    slug: 'bridal',
    isActive: true,
    displayOrder: 1
  },
  {
    category: 'SALON AT HOME',
    name: 'Luxury HydraFacial & Skin Glow',
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=600&fit=crop',
    slug: 'athome',
    isActive: true,
    displayOrder: 2
  },
  {
    category: 'HAIR EXPERT',
    name: 'Keratin Hair Spa & Smoothening',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop',
    slug: 'hair',
    isActive: true,
    displayOrder: 3
  },
  {
    category: 'PARTY & EVENT',
    name: 'Sangeet & Reception Glam Look',
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=600&fit=crop',
    slug: 'party',
    isActive: true,
    displayOrder: 4
  },
  {
    category: 'NAIL STUDIO',
    name: 'Gel Nail Extensions & Art',
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=600&fit=crop',
    slug: 'nail',
    isActive: true,
    displayOrder: 5
  }
];

@Injectable()
export class HomeBookingCardsService {
  constructor(
    @InjectModel(HomeBookingCard.name) private cardModel: Model<HomeBookingCardDocument>,
    private documentService: DocumentService,
  ) { }

  async createCard(dto: any, file?: Express.Multer.File, userId?: string) {
    let imageMediaId: Types.ObjectId | null = null;
    let uploadedUrl = dto.imageUrl || dto.image || '';

    if (file) {
      try {
        const media = await this.documentService.upload(
          file,
          'admin-home-content',
          userId || 'ADMIN'
        );
        imageMediaId = media._id;
        uploadedUrl = media.url || uploadedUrl;
      } catch (err) {
        console.error('File upload error:', err);
      }
    }

    const payload: any = {
      name: dto.name || dto.title || 'Beauty Service',
      category: (dto.category || 'SALON SERVICE').toUpperCase(),
      slug: dto.slug || (dto.name || dto.title || '').toLowerCase().replace(/\s+/g, '-'),
      isActive: dto.isActive !== undefined ? (dto.isActive === 'true' || dto.isActive === true) : true,
      displayOrder: dto.displayOrder ? Number(dto.displayOrder) : 1,
      imageUrl: uploadedUrl,
    };

    if (imageMediaId) {
      payload.imageMedia = imageMediaId;
    }

    const card = await this.cardModel.create(payload);
    return ApiResponse.success('Home Booking Card created successfully', card);
  }

  async getAllCards(onlyActive: boolean = false) {
    const filter = onlyActive ? { isActive: true } : {};
    let cards = await this.cardModel
      .find(filter)
      .populate('imageMedia', 'url _id')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    // Auto-seed initial default cards if DB is empty
    if (!cards || cards.length === 0) {
      try {
        await this.cardModel.insertMany(defaultCardsData);
        cards = await this.cardModel
          .find(filter)
          .populate('imageMedia', 'url _id')
          .sort({ displayOrder: 1, createdAt: -1 })
          .lean();
      } catch (err) {
        console.error('Auto seed error:', err);
      }
    }

    return ApiResponse.success('Home Booking Cards retrieved successfully', cards);
  }

  async updateCard(id: string, dto: any, file?: Express.Multer.File, userId?: string) {
    let card: HomeBookingCardDocument | null = null;

    // Check if ID is a valid Mongo ObjectId
    if (Types.ObjectId.isValid(id)) {
      card = await this.cardModel.findById(id);
    }

    // If not found by ID, try finding by name or slug
    if (!card && dto.name) {
      card = await this.cardModel.findOne({ name: dto.name.trim() });
    }

    // If still not found, create a new card document!
    if (!card) {
      return this.createCard(dto, file, userId);
    }

    if (file) {
      try {
        const media = await this.documentService.upload(
          file,
          'admin-home-content',
          userId || 'ADMIN'
        );
        card.imageMedia = media._id;
        card.imageUrl = media.url || card.imageUrl;
      } catch (err) {
        console.error('File update upload error:', err);
      }
    }

    if (dto.name) card.name = dto.name;
    if (dto.category) card.category = dto.category.toUpperCase();
    if (dto.slug) card.slug = dto.slug;
    if (dto.imageUrl && !file) card.imageUrl = dto.imageUrl;
    if (dto.displayOrder !== undefined) card.displayOrder = Number(dto.displayOrder);
    if (dto.isActive !== undefined) card.isActive = (dto.isActive === 'true' || dto.isActive === true);

    await card.save();
    return ApiResponse.success('Home Booking Card updated successfully', card);
  }

  async deleteCard(id: string) {
    let card: HomeBookingCardDocument | null = null;
    if (Types.ObjectId.isValid(id)) {
      card = await this.cardModel.findByIdAndDelete(id);
    }
    if (!card) {
      card = await this.cardModel.findOneAndDelete({ slug: id });
    }
    return ApiResponse.success('Home Booking Card deleted successfully', card || { id });
  }
}
