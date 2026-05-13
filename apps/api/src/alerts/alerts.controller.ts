import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.alertsService.findAllForUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAlertDto) {
    return this.alertsService.createAlert(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alertsService.updateAlert(user.sub, id, dto);
  }

  @Patch(':id/toggle')
  toggle(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.alertsService.toggleAlert(user.sub, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.alertsService.deleteAlert(user.sub, id);
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtPayload, @Query('page') page?: string) {
    return this.alertsService.getHistory(
      user.sub,
      page ? parseInt(page, 10) : 1,
    );
  }
}
