import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketType, TicketStatus } from '../../admin/schema/ticket.schema';

export class CreateTicketDto {
  @IsEnum(TicketType)
  @IsNotEmpty()
  ticketType: TicketType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  @IsNotEmpty()
  ticketStatus: TicketStatus;
}

export class AddTicketReplyDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
