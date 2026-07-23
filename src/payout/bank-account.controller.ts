import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto, UpdateBankAccountDto, UpdateBankAccountStatusDto } from './dto/bank-account.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payout/bank-account')
export class BankAccountController {
    constructor(private readonly bankAccountService: BankAccountService) { }

    @Roles(UserRole.VENDOR, UserRole.INFLUENCER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR)
    @Post('add')
    addBankAccount(@Req() req: any, @Body() dto: CreateBankAccountDto) {
        return this.bankAccountService.addBankAccount(req.user._id.toString(), req.user.roles, dto);
    }

    @Roles(UserRole.VENDOR, UserRole.INFLUENCER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR)
    @Put('update/:id')
    updateBankAccount(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
        return this.bankAccountService.updateBankAccount(req.user._id.toString(), id, dto);
    }

    @Roles(UserRole.VENDOR, UserRole.INFLUENCER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR)
    @Delete('delete/:id')
    deleteBankAccount(@Req() req: any, @Param('id') id: string) {
        return this.bankAccountService.deleteBankAccount(req.user._id.toString(), id);
    }

    @Roles(UserRole.VENDOR, UserRole.INFLUENCER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR)
    @Get('my-accounts')
    getMyBankAccounts(@Req() req: any) {
        return this.bankAccountService.getMyBankAccounts(req.user._id.toString());
    }


    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('admin/all')
    getAllBankAccounts() {
        return this.bankAccountService.getAllBankAccounts();
    }


    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('details/:id')
    getBankAccountById(@Param('id') id: string) {
        return this.bankAccountService.getBankAccountById(id);
    }


    @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
    @Put('update-status/:id')
    updateBankAccountStatus(@Param('id') id: string, @Body() dto: UpdateBankAccountStatusDto) {
        return this.bankAccountService.updateBankAccountStatus(id, dto);
    }
}
