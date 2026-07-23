import { Controller, Get } from "@nestjs/common";
import { AdminService } from "./admin.service";


@Controller('admin-public')
export class AdminPublicController{
    constructor(private readonly adminService:AdminService){}

    @Get('categories')
    fetchAllCategoris(){
        return this.adminService.fetchAllCategories()
    }
}