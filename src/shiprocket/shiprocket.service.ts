import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { HttpService } from '@nestjs/axios';

import { Model } from 'mongoose';

import { firstValueFrom } from 'rxjs';

import {
  ShiprocketToken,
  ShiprocketTokenDocument,
} from './schema/shiprocket-token.schema';
import { InsertShiprocketTokenDto } from './dto/InsertShiprocketToken.dto';

export interface ServiceabilityParams {
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
  declaredValue: number;
  isCOD: 0 | 1;
  length?: number;
  breadth?: number;
  height?: number;
}

@Injectable()
export class ShiprocketService {
  constructor(
    @InjectModel(ShiprocketToken.name)
    private readonly shiprocketTokenModel: Model<ShiprocketTokenDocument>,

    private readonly httpService: HttpService,
  ) { }

  private async generateToken(): Promise<string> {
    try {


      const { data } = await firstValueFrom(
        this.httpService.post(
          `${process.env.SHIPROCKET_USER_URL}/auth/login`,
          {
            email: process.env.SHIPROCKET_USER_EMAIL,
            password:
              process.env.SHIPROCKET_USER_PASSWORD,
          },
        ),
      );



      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 9);

      await this.shiprocketTokenModel.findOneAndUpdate(
        {},
        {
          token: data.token,
          expiresAt,
        },
        {
          upsert: true,
          new: true,
        },
      );

      return data.token;
    } catch (error) {
      console.log("Generate Ship Rocket Token Error", error)
      console.log('Message:', error.message);
      console.log('Response:', error.response?.data);
      console.log('Status:', error.response?.status);
      throw new InternalServerErrorException(
        'Failed to generate Shiprocket token',
      );
    }
  }

  async insertShiprocketToken(insertShiprocketTokenDto: InsertShiprocketTokenDto) {
    const expiresAt = insertShiprocketTokenDto.expiresAt
      ? new Date(insertShiprocketTokenDto.expiresAt)
      : new Date(new Date().setDate(new Date().getDate() + 9));

    const result = await this.shiprocketTokenModel.findOneAndUpdate(
      {},
      {
        token: insertShiprocketTokenDto.token,
        expiresAt,
      },
      {
        upsert: true,
        new: true,
      },
    );

    return result;
  }

  async getAuthToken(): Promise<string> {
    const tokenDoc =
      await this.shiprocketTokenModel.findOne();

    if (
      tokenDoc &&
      tokenDoc.expiresAt.getTime() > Date.now()
    ) {
      // console.log("Shiprocket token",tokenDoc.token)
      return tokenDoc.token;
    }
    return this.generateToken();
  }

  async getShippingOptions(
    params: ServiceabilityParams,
  ) {
    const token = await this.getAuthToken();

    const query = new URLSearchParams({
      pickup_postcode: params.pickupPincode,
      delivery_postcode: params.deliveryPincode,
      weight: String(params.weightKg),
      cod: String(params.isCOD),
      declared_value: String(
        params.declaredValue,
      ),
    });


    if (
      params.length &&
      params.breadth &&
      params.height
    ) {
      query.append(
        'length',
        String(params.length),
      );

      query.append(
        'breadth',
        String(params.breadth),
      );

      query.append(
        'height',
        String(params.height),
      );
    }

    const { data } = await firstValueFrom(
      this.httpService.get(
        `${process.env.SHIPROCKET_USER_URL}/courier/serviceability/?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      ),
    );

  
    const availableCouriers =
      data?.data?.available_courier_companies || [];

    if (!availableCouriers.length) {
      throw new BadRequestException(
        'No courier available for this route',
      );
    }

    // Only road/surface couriers
    const surfaceCouriers =
      availableCouriers.filter(
        (courier: any) =>
          courier.is_surface === true,
      );

    if (!surfaceCouriers.length) {
      throw new BadRequestException(
        'No surface courier available for this route',
      );
    }

    // Best courier:
    // 1. Highest tracking performance
    // 2. Lowest ETA hours

    const bestCourier = surfaceCouriers.sort(
      (a: any, b: any) => {
        if (
          b.tracking_performance !==
          a.tracking_performance
        ) {
          return (
            b.tracking_performance -
            a.tracking_performance
          );
        }

        return a.etd_hours - b.etd_hours;
      },
    )[0];

    return {
      courierCompanyId:
        bestCourier.courier_company_id,

      courierName:
        bestCourier.courier_name,

      shippingCharge:
        Number(bestCourier.rate),

      freightCharge:
        Number(bestCourier.freight_charge),

      codCharge:
        Number(bestCourier.cod_charges),

      estimatedDays: Number(
        bestCourier.estimated_delivery_days,
      ),

      estimatedDate:
        bestCourier.etd,

      estimatedHours:
        bestCourier.etd_hours,

      trackingPerformance:
        bestCourier.tracking_performance,

      rating:
        bestCourier.rating,

      rtoCharges:
        Number(bestCourier.rto_charges),

      isCODAvailable:
        Boolean(bestCourier.cod),
    };
  }
  async calculateShippingForVariant(
    vendorPincode: string,
    deliveryPincode: string,
    variant: any,
    isCOD: 0 | 1 = 0,
  ) {
    try {
      const shipping =
        await this.getShippingOptions({
          pickupPincode: vendorPincode,
          deliveryPincode: deliveryPincode,

          weightKg: Number(variant.weight || 0.5),

          declaredValue: Number(
            variant.salesPrice || variant.price,
          ),

          isCOD,

          length: Number(variant.length || 10),
          breadth: Number(variant.breadth || 10),
          height: Number(variant.height || 10),
        });

      return shipping;
    } catch (error: any) {
      return {
        shippingAvailable: false,
        message:
          error?.response?.data?.message ||
          'Shipping unavailable',
      };
    }
  }
}