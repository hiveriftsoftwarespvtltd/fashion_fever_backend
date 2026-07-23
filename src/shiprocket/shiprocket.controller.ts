import { Controller, Post, Body } from '@nestjs/common';
import { ShiprocketService } from './shiprocket.service';
import { InsertShiprocketTokenDto } from './dto/InsertShiprocketToken.dto';

@Controller('shiprocket')
export class ShiprocketController {
    constructor(private shipRocketService: ShiprocketService) { }

    @Post('get-auth-token')
    async getShiprocketToken() {
           return await this.shipRocketService.getAuthToken()
    }

    @Post('insert-token')
    async insertShiprocketToken(@Body() insertShiprocketTokenDto: InsertShiprocketTokenDto) {
        return await this.shipRocketService.insertShiprocketToken(insertShiprocketTokenDto);
    }
}
