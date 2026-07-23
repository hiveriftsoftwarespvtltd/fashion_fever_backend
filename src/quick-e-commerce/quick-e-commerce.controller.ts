import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { QuickECommerceService } from './quick-e-commerce.service';
import { QuickECommerceQueryDto } from './dto/quick-e-commerce-query.dto';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guards';

@Controller('quick-e-commerce')
export class QuickECommerceController {
    constructor(private readonly quickECommerceService: QuickECommerceService) { }

    @UseGuards(OptionalAuthGuard)
    @Get('products')
    async getProducts(@Query() query: QuickECommerceQueryDto, @Req() req: any) {
        const user = req.user;
        return this.quickECommerceService.getProducts(query, user);
    }
}

