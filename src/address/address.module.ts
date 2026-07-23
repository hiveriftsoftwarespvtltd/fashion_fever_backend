import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Address, AddressSchema } from './schema/address.schema';
import { Order, OrderSchema } from 'src/order/schema/order.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }, { name: Order.name, schema: OrderSchema }])],
  providers: [AddressService],
  controllers: [AddressController],
  exports: [AddressService, MongooseModule]
})
export class AddressModule { }
