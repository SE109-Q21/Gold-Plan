import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiService } from './ai.service';

class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: string;

  @IsString()
  content: string;
}

class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(200)
  async chat(
    @Body() dto: ChatRequestDto,
    @Req() req: any,
    @Res() res: any,
  ): Promise<void> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? 'unknown';

    this.aiService.checkGuestLimit(ip);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const delta of this.aiService.streamChat(dto.messages)) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    } catch {
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
