import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceProvider, ServiceProviderDocument, ServiceProviderVerificationStatus } from './schema/service-provider.schema';
import { Service, ServiceDocument } from './schema/service.schema';
import { ServiceService } from './service.service';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class ServiceSearchService {
  constructor(
    @InjectModel(ServiceProvider.name) private providerModel: Model<ServiceProviderDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    private serviceService: ServiceService,
  ) { }

  async searchServices(
    lat: number,
    lng: number,
    serviceName: string,
    dateStr?: string,
    city?: string,
    maxDistanceKm: number = 50,
  ) {
    const maxDistanceMeters = maxDistanceKm * 1000;

    // Build the query for $geoNear
    const geoQuery: any = {
      isDeleted: false,
      isActive: true,
      verificationStatus: ServiceProviderVerificationStatus.APPROVED,
    };

    if (city) {
      geoQuery.city = { $regex: city, $options: 'i' };
    }

    // 1. GeoNear aggregation to find nearby approved providers
    let providers: any[] = [];
    try {
      providers = await this.providerModel.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
            },
            distanceField: 'distance',
            maxDistance: maxDistanceMeters,
            spherical: true,
            query: geoQuery,
          },
        },
      ]);
    } catch (geoErr) {
      console.warn('geoNear aggregation fallback:', geoErr.message);
    }

    // Fallback 1: If city or query provided and geoNear was 0 (e.g. searching distant city), search directly
    if (!providers.length && city && city.trim()) {
      providers = await this.providerModel
        .find({
          isDeleted: false,
          isActive: true,
          verificationStatus: ServiceProviderVerificationStatus.APPROVED,
          $or: [
            { city: { $regex: city.trim(), $options: 'i' } },
            { address: { $regex: city.trim(), $options: 'i' } },
            { businessName: { $regex: city.trim(), $options: 'i' } },
          ],
        })
        .lean();
    }

    // Fallback 2: If still no providers found and no specific city was requested, load all approved providers
    if (!providers.length && (!city || !city.trim())) {
      providers = await this.providerModel
        .find({
          isDeleted: false,
          isActive: true,
          verificationStatus: ServiceProviderVerificationStatus.APPROVED,
        })
        .lean();
    }

    if (!providers.length) {
      return ApiResponse.success('No providers found nearby', []);
    }

    const providerIds = providers.map((p) => p._id);

    // 2. Find services matching the serviceName for these providers
    const matchQuery: any = {
      providerId: { $in: providerIds },
      isActive: true,
    };

    if (serviceName) {
      matchQuery.$or = [
        { title: { $regex: serviceName, $options: 'i' } },
        { description: { $regex: serviceName, $options: 'i' } },
      ];
    }

    const services = await this.serviceModel
      .find(matchQuery)
      .populate('categoryId', 'name label')
      .populate('images', 'url')
      .lean();

    // 3. Group services by provider
    const servicesByProvider = new Map();
    services.forEach((svc) => {
      const pId = svc.providerId.toString();
      if (!servicesByProvider.has(pId)) {
        servicesByProvider.set(pId, []);
      }
      servicesByProvider.get(pId).push(svc);
    });

    // 4. Filter providers that have matching services and fetch slots
    const targetDate = dateStr || new Date().toISOString();
    const results: any[] = [];

    for (const provider of providers) {
      const pId = provider._id.toString();
      if (servicesByProvider.has(pId)) {
        // Fetch slots
        let slots: any[] = [];
        let earliestSlot: any = null;
        try {
          const providerServices = servicesByProvider.get(pId) || [];
          if (providerServices.length > 0) {
            const firstServiceId = providerServices[0]._id.toString();
            const slotsRes = await this.serviceService.getAvailableSlots(pId, { serviceIds: [firstServiceId], date: targetDate });
            slots = slotsRes.data?.slots || [];
            earliestSlot = slotsRes.data?.earliestSlot || null;
          }
        } catch (error) {
          // Ignore slot fetch errors for individual providers to avoid failing the whole search
          console.error(`Failed to fetch slots for provider ${pId}:`, error);
        }

        let distKm = 0;
        if (provider.distance !== undefined) {
          distKm = parseFloat((provider.distance / 1000).toFixed(2));
        } else if (Array.isArray(provider.coordinates) && provider.coordinates.length === 2) {
          const pLng = provider.coordinates[0];
          const pLat = provider.coordinates[1];
          const dLat = ((pLat - lat) * Math.PI) / 180;
          const dLon = ((pLng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((pLat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distKm = parseFloat((6371 * c).toFixed(2));
        }

        results.push({
          provider: {
            _id: provider._id,
            businessName: provider.businessName,
            address: provider.address,
            city: provider.city,
            coordinates: provider.coordinates,
            rating: provider.rating,
            totalReviews: provider.totalReviews,
            distance: provider.distance !== undefined ? provider.distance : distKm * 1000,
          },
          distanceKm: distKm,
          services: servicesByProvider.get(pId),
          availableSlots: slots,
          earliestSlot: earliestSlot,
        });
      }
    }

    return ApiResponse.success('Search results', results);
  }
}
