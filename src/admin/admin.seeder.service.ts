import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { faker } from '@faker-js/faker';
import { UserRole } from 'src/user/schema/user.schema';
import { ApiResponse } from 'src/common/responses/api-response';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminSeederService {
  constructor(@InjectConnection() private readonly connection: Connection) { }

  private async generateMedia(type: 'image' | 'video' = 'image') {
    const MediaModel = this.connection.model('Media');
    const media = new MediaModel({
      url: type === 'image' ? faker.image.url() : 'https://www.w3schools.com/html/mov_bbb.mp4',
      publicId: faker.string.uuid(),
      type: type,
      originalName: faker.system.fileName(),
      mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
      size: faker.number.int({ min: 1024, max: 5000000 }),
      folder: 'seeder',
      storage: 'local',
      isActive: true,
    });
    await media.save();
    return media._id;
  }

  async seedData(counts: {
    users: number;
    vendors: number;
    educators: number;
    providers: number;
    influencers: number;
  }) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const defaultPassword = await bcrypt.hash('Password@123', 10);

      const UserModel = this.connection.model('User');
      const VendorModel = this.connection.model('Vendor');
      const CategoryModel = this.connection.model('Category');
      const ProductModel = this.connection.model('Product');
      const ProductVariantModel = this.connection.model('ProductVariant');

      const EducatorModel = this.connection.model('Educator');
      const CourseCategoryModel = this.connection.model('CourseCategory');
      const CourseModel = this.connection.model('Course');
      const CourseSectionModel = this.connection.model('CourseSection');
      const CourseLessonModel = this.connection.model('CourseLesson');

      const ServiceProviderModel = this.connection.model('ServiceProvider');
      const ServiceCategoryModel = this.connection.model('ServiceCategory');
      const ServiceModel = this.connection.model('Service');

      const InfluencerModel = this.connection.model('Influencer');

      // 1. Seed Categories
      const categories: any[] = [];
      for (let i = 0; i < 5; i++) {
        const department = faker.commerce.department();
        const cat = new CategoryModel({
          name: department + ' ' + faker.string.alpha(3),
          label: department,
          description: faker.lorem.sentence(),
          slug: faker.helpers.slugify(department + ' ' + faker.string.uuid()),
          image: await this.generateMedia(),
          status: 'ACTIVE',
        });
        await cat.save({ session });
        categories.push(cat._id);
      }

      const courseCategories: any[] = [];
      for (let i = 0; i < 5; i++) {
        const cat = new CourseCategoryModel({
          name: faker.company.catchPhraseAdjective() + ' Course ' + faker.string.alpha(3),
          description: faker.lorem.sentence(),
          image: await this.generateMedia(),
          label: faker.company.catchPhraseAdjective() +
            ' Course ' +
            faker.string.alpha(3),
          isActive: true,
        });
        await cat.save({ session });
        courseCategories.push(cat._id);
      }

      const serviceCategories: any[] = [];
      for (let i = 0; i < 5; i++) {
        const cat = new ServiceCategoryModel({
          name: faker.commerce.department() + ' Service ' + faker.string.alpha(3),
          label: faker.commerce.department() + ' Service ' + faker.string.alpha(3),
          description: faker.lorem.sentence(),
          image: await this.generateMedia(),
          isActive: true,
        });
        await cat.save({ session });
        serviceCategories.push(cat._id);
      }

      // 2. Seed Users
      for (let i = 0; i < counts.users; i++) {
        const u = new UserModel({
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          password: defaultPassword,
          role: UserRole.USER,
          phone: faker.phone.number(),
          isEmailVerified: true,
        });
        await u.save({ session });
      }

      // 3. Seed Vendors
      for (let i = 0; i < counts.vendors; i++) {
        const u = new UserModel({
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          password: defaultPassword,
          role: UserRole.VENDOR,
          isEmailVerified: true,
          isVendorOnboardingCompleted: true,
        });
        await u.save({ session });

        const vendor = new VendorModel({
          ownerId: u._id,
          businessName: faker.company.name(),
          slug: faker.helpers.slugify(faker.company.name() + ' ' + faker.string.uuid()),
          email: u.email,
          phone: faker.phone.number(),
          description: faker.lorem.paragraph(),
          city: faker.location.city(),
          state: faker.location.state(),
          vendorPincode: faker.location.zipCode(),
          logo: await this.generateMedia(),
          banner: await this.generateMedia(),
          status: 'APPROVED',
          isApproved: true,
          commissionRate: 10,
        });
        await vendor.save({ session });
        u.vendorId = vendor._id;
        await u.save({ session });



        // Products for vendor
        for (let j = 0; j < 3; j++) {
          const product = new ProductModel({
            name: faker.commerce.productName(),
            slug: faker.helpers.slugify(faker.commerce.productName() + ' ' + faker.string.uuid()),
            description: faker.commerce.productDescription(),
            vendorId: vendor._id,
            createdBy: u._id,
            categoryId: faker.helpers.arrayElement(categories),
            status: 'ACTIVE',
            hasVariants: true,
          });
          await product.save({ session });

          const variant = new ProductVariantModel({
            productId: product._id,
            sku: faker.string.alphanumeric(8).toUpperCase(),
            costPrice: faker.number.float({ min: 10, max: 50, multipleOf: 0.01 }),
            salesPrice: faker.number.float({ min: 60, max: 100, multipleOf: 0.01 }),
            stock: faker.number.int({ min: 10, max: 100 }),
            thumbnail: await this.generateMedia(),
            weight: faker.number.int({ min: 100, max: 500 }),
            length: 10, width: 10, height: 10,
          });
          await variant.save({ session });

          product.variants = [variant._id];
          await product.save({ session });
        }
      }

      // 4. Seed Educators
      for (let i = 0; i < counts.educators; i++) {
        const u = new UserModel({
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          password: defaultPassword,
          role: UserRole.EDUCATOR,
          isEmailVerified: true,
          isEducatorOnboardingCompleted: true,
        });
        await u.save({ session });

        const educator = new EducatorModel({
          userId: u._id,
          bio: faker.lorem.paragraph(),
          expertise: [faker.word.noun(), faker.word.noun()],
          profileImage: await this.generateMedia(),
          status: 'APPROVED',
          comissionRate: 15,
        });
        await educator.save({ session });
        u.educatorId = educator._id;
        await u.save({ session });



        for (let j = 0; j < 2; j++) {
          const course = new CourseModel({
            educatorId: educator._id,
            categoryId: faker.helpers.arrayElement(courseCategories),
            title: faker.commerce.department() + ' Masterclass',
            description: faker.lorem.paragraph(),
            costPrice: faker.number.float({ min: 50, max: 200, multipleOf: 0.01 }),
            sellingPrice: faker.number.float({ min: 100, max: 300, multipleOf: 0.01 }),
            offeredPrice: faker.number.float({ min: 80, max: 250, multipleOf: 0.01 }),
            thumbnail: await this.generateMedia(),
            level: 'BEGINNER',
            status: 'PUBLISHED',
          });
          await course.save({ session });

          const section = new CourseSectionModel({
            courseId: course._id,
            title: 'Introduction',
            order: 1,
          });
          await section.save({ session });

          const lesson = new CourseLessonModel({
            courseId: course._id,
            sectionId: section._id,
            title: 'Welcome Video',
            description: faker.lorem.sentence(),
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            duration: faker.number.int({ min: 5, max: 30 }),
            order: 1,
          });
          await lesson.save({ session });
        }
      }

      // 5. Seed Service Providers
      for (let i = 0; i < counts.providers; i++) {
        const u = new UserModel({
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          password: defaultPassword,
          role: UserRole.SERVICE_PROVIDER,
          isEmailVerified: true,
          isServiceProviderOnboardingCompleted: true,
        });
        await u.save({ session });

        const provider = new ServiceProviderModel({
          userId: u._id,
          businessName: faker.company.name(),
          description: faker.lorem.paragraph(),
          experienceYears: faker.number.int({ min: 1, max: 20 }),
          phone: faker.phone.number(),
          email: u.email,
          gstNumber: faker.string.alphanumeric(15).toUpperCase(),
          panNumber: faker.string.alphanumeric(10).toUpperCase(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          pincode: faker.location.zipCode(),
          status: 'APPROVED',
        });
        await provider.save({ session });
        u.serviceProviderId = provider._id;
        await u.save({ session });



        for (let j = 0; j < 2; j++) {
          const service = new ServiceModel({
            providerId: provider._id,
            categoryId: faker.helpers.arrayElement(serviceCategories),
            title: faker.commerce.productName() + ' Service',
            description: faker.lorem.paragraph(),
            durationMinutes: faker.number.int({ min: 30, max: 120 }),
            costPrice: faker.number.float({ min: 20, max: 50, multipleOf: 0.01 }),
            sellingPrice: faker.number.float({ min: 60, max: 150, multipleOf: 0.01 }),
            offeredPrice: faker.number.float({ min: 55, max: 140, multipleOf: 0.01 }),
            images: [await this.generateMedia()],
          });
          await service.save({ session });
        }
      }

      // 6. Seed Influencers
      for (let i = 0; i < counts.influencers; i++) {
        const u = new UserModel({
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          password: defaultPassword,
          role: UserRole.INFLUENCER,
          isEmailVerified: true,
          isInfluencerOnboardingCompleted: true,
        });
        await u.save({ session });

        const influencer = new InfluencerModel({
          userId: u._id,
          name: u.name,
          instagram: faker.internet.username(),
          youtube: faker.internet.username(),
          tiktok: faker.internet.username(),
          status: 'active',
        });
        await influencer.save({ session });
        u.influencerId = influencer._id;
        await u.save({ session });


      }

      await session.commitTransaction();
      return ApiResponse.success('Database populated successfully.', {
        seeded: counts,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Seeding failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
