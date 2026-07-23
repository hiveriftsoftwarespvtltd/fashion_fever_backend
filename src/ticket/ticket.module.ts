import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { Ticket, TicketSchema } from '../admin/schema/ticket.schema';
import { DocumentModule } from '../document/document.module';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema },{ name: Admin.name, schema: AdminSchema },]),
    DocumentModule,
  ],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
