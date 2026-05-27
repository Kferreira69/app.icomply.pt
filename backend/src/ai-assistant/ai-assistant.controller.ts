import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiAssistantService } from './ai-assistant.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatDto {
  messages: ChatMessage[];
}

@UseGuards(JwtAuthGuard)
@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly service: AiAssistantService) {}

  @Post('chat')
  async chat(@Request() req: any, @Body() body: ChatDto) {
    const organizationId = req.user.organizationId;
    const reply = await this.service.chat(organizationId, body.messages);
    return { reply };
  }
}
