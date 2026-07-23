import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ServiceSearchService } from './service-search.service';

@Controller('service-search')
export class ServiceSearchController {
  constructor(private readonly serviceSearchService: ServiceSearchService) { }

  @Get()
  searchServices(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('serviceName') serviceName: string,
    @Query('date') date?: string,
    @Query('city') city?: string,
    @Query('maxDistanceKm') maxDistanceKm?: string,
  ) {
    if (!lat || !lng) {
      throw new BadRequestException('Latitude (lat) and Longitude (lng) are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Latitude and Longitude must be valid numbers');
    }

    const maxDist = maxDistanceKm ? parseFloat(maxDistanceKm) : 50;

    return this.serviceSearchService.searchServices(
      latitude,
      longitude,
      serviceName || '',
      date,
      city,
      maxDist,
    );
  }
}
