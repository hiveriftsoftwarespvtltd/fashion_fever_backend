import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Address, AddressDocument } from './schema/address.schema';
import { Model, Types } from 'mongoose';
import { AddAddressDTO, UpdateAddressDTO } from './dto/address.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { Order, OrderDocument } from 'src/order/schema/order.schema';

@Injectable()
export class AddressService {
    constructor(@InjectModel(Address.name) private addressModel: Model<AddressDocument>, @InjectModel(Order.name) private orderModel: Model<OrderDocument>) { }

    async addAddress(dto: AddAddressDTO, userId: string) {
        const newAddress = await this.addressModel.create({
            user: new Types.ObjectId(userId),
            line1: dto.line1,
            line2: dto.line2,
            phone1: dto.phone1,
            phone2: dto.phone2,
            landmark: dto.landmark,
            city: dto.city,
            state: dto.state,
            pincode: dto.pincode,
            location: dto.location || {
                type: "Point",
                coordinates: [0, 0]
            }

        })

        return ApiResponse.success("Address Addded Successfully", newAddress)
    }

    async fetchAddress(userId: string) {
        const addresses = await this.addressModel.find({ user: new Types.ObjectId(userId) })
        return ApiResponse.success("Addresses fetched Successfully", addresses || [])
    }

    async deleteAddress(userId: string, addressId: string) {
        const address = await this.addressModel.findOne({
            _id: new Types.ObjectId(addressId),
            user: new Types.ObjectId(userId),
        });

        if (!address) {
            throw new NotFoundException("Address Not Found");
        }

        const orderExists = await this.orderModel.exists({
            userId: new Types.ObjectId(userId),
            addressId: new Types.ObjectId(addressId),
        });

        if (orderExists) {
            await this.addressModel.updateOne(
                { _id: address._id },
                {
                    $set: {
                        isDeleted: true,
                        isActive: false,
                    },
                },
            );

            return ApiResponse.success(
                "Address is associated with orders and has been archived."
            );
        }

        await address.deleteOne();

        return ApiResponse.success("Address deleted successfully");
    }

    async fetchAddressDetails(userId: string, addressId: string) {
        const address = await this.addressModel.findOne({ user: new Types.ObjectId(userId), _id: new Types.ObjectId(addressId) })
        if (!address) {
            throw new NotFoundException("Address not found")
        }

        return ApiResponse.success("Address details fetched Successfully", address)
    }

    async updateAddress(dto: UpdateAddressDTO, userId: string, addressId: string) {
        const address = await this.addressModel.findOne({ user: new Types.ObjectId(userId), _id: new Types.ObjectId(addressId) })
        if (!address) {
            throw new NotFoundException("Address not found")
        }

        const filteredData = Object.fromEntries(Object.entries(dto).filter(([_, value]) => value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')))

        Object.assign(address, filteredData)
        await address.save()

        return ApiResponse.success("Address Updated Successfully", address)

    }
}
