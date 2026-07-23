import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { DeliveryPersonCashSettlementService } from './delivery-person-cash-settlement.service';
import { GenerateCashSettlementDto } from './dto/cash-settlement.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@Controller('delivery-person/cash-settlement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY_PERSON)
export class DeliveryPersonCashSettlementController {
    constructor(private readonly settlementService: DeliveryPersonCashSettlementService) { }

    @Post('deposit')
    async generateCashSettlement(@Req() req: any, @Body() dto: GenerateCashSettlementDto) {
        return this.settlementService.generateCashSettlement(
            req.user._id,
            dto.transactionId,
            dto.depositedAmount,
            dto.remarks
        );
    }
}
