import {
  Body, Controller, Get, Param, Patch, Post, Query,
  Request, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly service: SupportTicketsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateTicketDto) {
    return this.service.create(req.user.userId, req.user.organizationId, dto);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      return { open: 0, inProgress: 0, waitingUser: 0, resolved: 0, total: 0 };
    }
    return this.service.getStats();
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('status') status?: TicketStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(req.user.userId, req.user.role, status, page, limit);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(id, req.user.userId, req.user.role);
  }

  @Post(':id/replies')
  addReply(@Request() req: any, @Param('id') ticketId: string, @Body() dto: CreateReplyDto) {
    return this.service.addReply(ticketId, req.user.userId, req.user.role, dto);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.service.update(id, req.user.userId, req.user.role, dto);
  }
}
