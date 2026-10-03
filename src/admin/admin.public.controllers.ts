import { Controller, Get } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { HomeBookingCardsService } from "./home-booking-cards.service";

@Controller('admin-public')
export class AdminPublicController{
    constructor(
        private readonly adminService: AdminService,
        private readonly cardsService: HomeBookingCardsService
    ){}

    @Get('categories')
    fetchAllCategoris(){
        return this.adminService.fetchAllCategories()
    }

    @Get('home-booking-cards')
    getPublicBookingCards(){
        return this.cardsService.getAllCards(true);
    }
}