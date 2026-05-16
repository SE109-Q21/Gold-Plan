import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SmartAlertsService } from './smart-alerts.service';
import { CreateSmartAlertDto } from './dto/create-smart-alert.dto';

@UseGuards(JwtAuthGuard)
@Controller('smart-alerts')
export class SmartAlertsController {
  constructor(private readonly smartAlertsService: SmartAlertsService) {}

  @Get()
  getUserAlerts(@CurrentUser() user: { sub: string }) {
    return this.smartAlertsService.getUserAlerts(user.sub);
  }

  @Post()
  createSmartAlert(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateSmartAlertDto,
  ) {
    return this.smartAlertsService.createSmartAlert(user.sub, dto);
  }

  @Patch(':id/toggle')
  toggleAlert(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.smartAlertsService.toggleAlert(user.sub, id);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteAlert(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.smartAlertsService.deleteAlert(user.sub, id);
  }
}
