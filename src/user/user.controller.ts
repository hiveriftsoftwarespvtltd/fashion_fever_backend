import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { AddAddressDTO, UpdateAddressDTO } from 'src/address/dto/address.dto';
import { ApplyRolesDTO } from './dto/apply-roles.dto';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) { }

  // @Get()
  // findAll() {
  //   return this.userService.findAll();
  // }

  // @Post()
  // createUser(@Body() dto: CreateUserDto) {
  //   return this.userService.create(dto);
  // }



  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@UploadedFile() file: any, @Req() req: any) {
    return this.userService.uploadAvatar(req.user._id, file);
  }

  @Delete('delete-avatar')
  deleteAvatar(@Req() req: any) {
    return this.userService.deleteUserAvatar(req.user._id);
  }

  @Get('get-user-avatar')
  getUserAvatar(@Req() req: any) {
    return this.userService.getUserAvatar(req.user._id);
  }

  @Get('requested-roles')
  getRequestedRoles(@Req() req: any) {
    return this.userService.getRequestedRoles(req.user._id);
  }

  @Post('apply-for-roles')
  applyRoles(@Req() req: any, @Body() dto: ApplyRolesDTO) {
    return this.userService.applyRoles(req.user._id, dto.roles);
  }

  @Get('user-details')
  findOne(@Req() req: any) {
    return this.userService.findById(req.user._id);
  }

  @Patch('edit-user-details')
  updateUser(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(req.user._id, dto);
  }

  @Delete('delete-user-account')
  deleteAccount(@Req() req: any) {
    return this.userService.deletAccount(req.user._id);
  }

  //
  @Get('products')
  async fetchProducts(
    @Req() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ) {

    return this.userService.fetchProducts(
      req.user._id,
      categoryId,
      minPrice,
      maxPrice,
    );
  }

  // addresses
  @Get('fetch-addresses')
  async fetchAddress(@Req() req: any) {
    return await this.userService.fetchAddresses(req.user._id);
  }

  @Post('add-address')
  async addAddress(@Req() req: any, @Body() dto: AddAddressDTO) {
    return await this.userService.addAddress(dto, req.user._id);
  }

  @Get('fetch-address-details/:id')
  async fetchAddressDetails(@Req() req: any, @Param('id') id: string) {
    return await this.userService.fetchAddressDetails(req.user._id, id);
  }

  @Get('product-details/:id')
  async fetchProductdetails(@Req() req: any, @Param('id') id: string) {
    return await this.userService.fetchProductDetails(req.user._id, id);
  }

  @Put('update-address/:id')
  async updateAddress(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDTO,
  ) {
    return this.userService.updateAddress(dto, req.user._id, id);
  }

  @Delete('delete-address/:id')
  async deleteAddress(@Req() req: any, @Param('id') id: string) {
    return this.userService.deleteAddress(req.user._id, id);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.removeUser(id);
  }
}
