import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketType, TicketStatus } from '../../admin/schema/ticket.schema';

export class CreateTicketDto {
  @IsEnum(TicketType)
  @IsNotEmpty()
  ticketType: TicketType;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  @IsNotEmpty()
  ticketStatus: TicketStatus;
}
