import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HomeBookingCardsService } from './home-booking-cards.service';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guards';

@Controller('admin/home-booking-cards')
export class HomeBookingCardsController {
  constructor(private readonly cardsService: HomeBookingCardsService) {}

  // Public endpoint for Home Page BookingsSection
  @Get('public')
  getPublicCards() {
    return this.cardsService.getAllCards(true);
  }

  // Admin endpoint to list all cards
  @Get('all')
  getAllCards() {
    return this.cardsService.getAllCards(false);
  }

  @Get()
  getCards() {
    return this.cardsService.getAllCards(false);
  }

  // Admin endpoint to add new card with file upload from computer
  @UseGuards(OptionalAuthGuard)
  @Post('add')
  @UseInterceptors(FileInterceptor('file'))
  createCard(
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.cardsService.createCard(dto, file, req.user?._id?.toString());
  }

  // Support POST update/:id
  @UseGuards(OptionalAuthGuard)
  @Post('update/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateCardPost(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.cardsService.updateCard(id, dto, file, req.user?._id?.toString());
  }

  // Support PUT update/:id
  @UseGuards(OptionalAuthGuard)
  @Put('update/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateCardPut(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.cardsService.updateCard(id, dto, file, req.user?._id?.toString());
  }

  // Support PUT :id
  @UseGuards(OptionalAuthGuard)
  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  updateCardDirect(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.cardsService.updateCard(id, dto, file, req.user?._id?.toString());
  }

  // Admin endpoint to delete card
  @UseGuards(OptionalAuthGuard)
  @Delete('delete/:id')
  deleteCard(@Param('id') id: string) {
    return this.cardsService.deleteCard(id);
  }

  @UseGuards(OptionalAuthGuard)
  @Delete(':id')
  deleteCardDirect(@Param('id') id: string) {
    return this.cardsService.deleteCard(id);
  }
}
