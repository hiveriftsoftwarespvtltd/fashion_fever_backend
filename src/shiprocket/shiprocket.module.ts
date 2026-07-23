import { Module } from '@nestjs/common';
import { ShiprocketService } from './shiprocket.service';
import { ShiprocketController } from './shiprocket.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiprocketToken, ShipRocketTokenSchema } from './schema/shiprocket-token.schema';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[MongooseModule.forFeature([{name:ShiprocketToken.name,schema:ShipRocketTokenSchema}]),HttpModule],
  providers: [ShiprocketService],
  controllers: [ShiprocketController],
  exports:[MongooseModule,ShiprocketService]
})
export class ShiprocketModule {}
