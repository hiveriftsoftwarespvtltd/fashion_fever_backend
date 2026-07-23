import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument, TicketStatus } from '../admin/schema/ticket.schema';
import { CreateTicketDto, UpdateTicketStatusDto } from './dto/ticket.dto';
import { DocumentService } from '../document/document.service';
import { UserRole } from '../user/schema/user.schema';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class TicketService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    private documentService: DocumentService,
  ) { }

  async createTicket(userId: string, dto: CreateTicketDto, files: any[]) {
    let mediaFiles: any = [];

    if (files && files.length > 0) {
      if (files.length > 4) {
        throw new BadRequestException('You can upload a maximum of 4 media files.');
      }
      const uploadResponse = await this.documentService.uploadMultiplFiles(files, 'tickets', userId);
      if (uploadResponse && uploadResponse.data) {
        mediaFiles = uploadResponse.data.map((m: any) => m._id);
      }
    }

    const ticket = await this.ticketModel.create({
      userId: new Types.ObjectId(userId),
      ticketType: dto.ticketType,
      description: dto.description,
      mediaFiles,
    });

    return ApiResponse.success('Ticket created successfully', ticket, 201);
  }

  async getMyTickets(userId: string) {
    const tickets = await this.ticketModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('mediaFiles', "url _id publicId")
      .sort({ createdAt: -1 });

    return ApiResponse.success('Tickets fetched successfully', tickets);
  }

  async getAllTickets() {
    const tickets = await this.ticketModel
      .find()
      .populate('userId', 'name email roles')
      .populate('mediaFiles', "url _id publicId")
      .sort({ createdAt: -1 });

    return ApiResponse.success('All tickets fetched successfully', tickets);
  }

  async getTicketDetails(ticketId: string, user: any) {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('userId', 'name email roles')
      .populate('mediaFiles');

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isOwner = ticket.userId.toString() === user._id.toString();
    const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You are not allowed to view this ticket');
    }

    return ApiResponse.success('Ticket details fetched successfully', ticket);
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto, user: any) {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isOwner = ticket.userId.toString() === user._id.toString();
    const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You are not allowed to update this ticket');
    }

    ticket.ticketStatus = dto.ticketStatus;
    await ticket.save();

    return ApiResponse.success('Ticket status updated successfully', ticket);
  }

  async deleteTicket(ticketId: string, user: any) {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can delete tickets');
    }

    await this.ticketModel.findByIdAndDelete(ticketId);

    return ApiResponse.success('Ticket deleted successfully');
  }
}
