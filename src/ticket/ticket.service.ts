import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument, TicketStatus } from '../admin/schema/ticket.schema';
import { CreateTicketDto, UpdateTicketStatusDto, AddTicketReplyDto } from './dto/ticket.dto';
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
      vendorId: dto.vendorId ? new Types.ObjectId(dto.vendorId) : undefined,
      orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : undefined,
      productId: dto.productId ? new Types.ObjectId(dto.productId) : undefined,
      mediaFiles,
    });

    return ApiResponse.success('Ticket created successfully', ticket, 201);
  }

  async getMyTickets(userId: string) {
    const tickets = await this.ticketModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('vendorId', 'businessName name email phone storeName')
      .populate('productId', 'name thumbnail images price')
      .populate('mediaFiles', "url _id publicId")
      .sort({ createdAt: -1 });

    return ApiResponse.success('Tickets fetched successfully', tickets);
  }

  async getVendorTickets(vendorId: string) {
    const tickets = await this.ticketModel
      .find({ vendorId: new Types.ObjectId(vendorId) })
      .populate('userId', 'name email phone roles')
      .populate('productId', 'name thumbnail images price')
      .populate('mediaFiles', "url _id publicId")
      .sort({ createdAt: -1 });

    return ApiResponse.success('Vendor tickets fetched successfully', tickets);
  }

  async getAllTickets(query: any = {}) {
    const { ticketStatus, ticketType, search, page = 1, limit = 10 } = query;
    const filter: any = {};

    if (ticketStatus && ticketStatus !== 'ALL') {
      filter.ticketStatus = ticketStatus;
    }

    if (ticketType && ticketType !== 'ALL') {
      filter.ticketType = ticketType;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .populate('userId', 'name email roles phone')
        .populate('vendorId', 'businessName name email phone storeName ownerName')
        .populate('productId', 'name thumbnail images price')
        .populate('mediaFiles', 'url _id publicId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      this.ticketModel.countDocuments(filter),
    ]);

    return ApiResponse.success('All tickets fetched successfully', {
      data: tickets,
      total,
      page: pageNum,
      limit: limitNum,
    });
  }

  async getTicketDetails(ticketId: string, user: any) {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('userId', 'name email roles phone')
      .populate('vendorId', 'businessName name email phone storeName ownerName')
      .populate('productId', 'name thumbnail images price')
      .populate('mediaFiles');

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isOwner = ticket.userId?._id?.toString() === user._id.toString() || ticket.userId?.toString() === user._id.toString();
    const isAssignedVendor = ticket.vendorId?._id?.toString() === user.vendorId?.toString() || ticket.vendorId?.toString() === user.vendorId?.toString();
    const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);

    if (!isOwner && !isAssignedVendor && !isAdmin) {
      throw new ForbiddenException('You are not allowed to view this ticket');
    }

    return ApiResponse.success('Ticket details fetched successfully', ticket);
  }

  async addTicketReply(ticketId: string, dto: AddTicketReplyDto, user: any) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isOwner = ticket.userId.toString() === user._id.toString();
    const isAssignedVendor = user.roles?.includes(UserRole.VENDOR) && (ticket.vendorId?.toString() === user.vendorId?.toString() || ticket.vendorId?.toString() === user._id.toString());
    const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);

    if (!isOwner && !isAssignedVendor && !isAdmin) {
      throw new ForbiddenException('You are not allowed to reply to this ticket');
    }

    let senderRole: 'USER' | 'VENDOR' | 'ADMIN' = 'USER';
    if (isAdmin) senderRole = 'ADMIN';
    else if (isAssignedVendor) senderRole = 'VENDOR';

    ticket.replies = ticket.replies || [];
    ticket.replies.push({
      senderId: new Types.ObjectId(user._id),
      senderRole,
      senderName: user.name || (isAdmin ? 'Platform Support' : isAssignedVendor ? 'Vendor Partner' : 'Customer'),
      message: dto.message,
      createdAt: new Date(),
    });

    if (ticket.ticketStatus === TicketStatus.PENDING && (isAssignedVendor || isAdmin)) {
      ticket.ticketStatus = TicketStatus.OPEN;
    }

    await ticket.save();

    return ApiResponse.success('Reply added successfully', ticket);
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto, user: any) {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isOwner = ticket.userId.toString() === user._id.toString();
    const isAssignedVendor = user.roles?.includes(UserRole.VENDOR) && (ticket.vendorId?.toString() === user.vendorId?.toString() || ticket.vendorId?.toString() === user._id.toString());
    const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);

    if (!isOwner && !isAssignedVendor && !isAdmin) {
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
