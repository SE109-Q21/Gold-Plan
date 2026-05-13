import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PersonalisationService } from './personalisation.service';
import { RecordViewDto } from './dto/record-view.dto';
import { AddPinDto, RemovePinDto, ReorderPinsDto } from './dto/pin.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('personalisation')
@UseGuards(JwtAuthGuard)
export class PersonalisationController {
  constructor(private readonly personalisationService: PersonalisationService) {}

  @Post('view')
  @HttpCode(202)
  recordView(@CurrentUser() user: JwtPayload, @Body() dto: RecordViewDto): void {
    setImmediate(() => this.personalisationService.recordView(user.sub, dto.brand, dto.goldType));
  }

  @Get('order')
  getTableOrder(@CurrentUser() user: JwtPayload) {
    return this.personalisationService.getTableOrder(user.sub);
  }

  @Post('pin')
  @HttpCode(204)
  addPin(@CurrentUser() user: JwtPayload, @Body() dto: AddPinDto) {
    return this.personalisationService.addPin(user.sub, dto.brand, dto.goldType);
  }

  @Delete('pin')
  @HttpCode(204)
  removePin(@CurrentUser() user: JwtPayload, @Body() dto: RemovePinDto) {
    return this.personalisationService.removePin(user.sub, dto.brand, dto.goldType);
  }

  @Patch('pin/reorder')
  @HttpCode(204)
  reorderPins(@CurrentUser() user: JwtPayload, @Body() dto: ReorderPinsDto) {
    return this.personalisationService.reorderPins(user.sub, dto.order);
  }

  @Delete('reset')
  @HttpCode(204)
  resetPreferences(@CurrentUser() user: JwtPayload) {
    return this.personalisationService.resetPreferences(user.sub);
  }
}
