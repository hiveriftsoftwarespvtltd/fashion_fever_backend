import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AiFeaturesService } from './ai-features.service';
import { ChatQueryDto } from './dto/chat-query.dto';
import { OptionalAuthGuard } from '../auth/optional-auth.guards';

@Controller('ai-features')
export class AiFeaturesController {
  constructor(private readonly aiFeaturesService: AiFeaturesService) { }

  @UseGuards(OptionalAuthGuard)
  @Post('chat')
  async chat(@Body() chatQueryDto: ChatQueryDto, @Req() req: any) {
   
    return this.aiFeaturesService.handleChatQuery(chatQueryDto, req.user);
  }
}
