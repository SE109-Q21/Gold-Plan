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
import { PortfolioService } from './portfolio.service';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { EditTransactionDto } from './dto/edit-transaction.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@CurrentUser() user: JwtPayload) {
    return this.portfolioService.getPortfolio(user.sub);
  }

  @Get('chart')
  getValueChart(@CurrentUser() user: JwtPayload) {
    return this.portfolioService.getValueChart(user.sub);
  }

  @Get('allocation')
  getAllocationBreakdown(@CurrentUser() user: JwtPayload) {
    return this.portfolioService.getAllocationBreakdown(user.sub);
  }

  @Get('transactions')
  listTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
  ) {
    return this.portfolioService.listTransactions(
      user.sub,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Post('transactions')
  addTransaction(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddTransactionDto,
  ) {
    return this.portfolioService.addTransaction(user.sub, dto);
  }

  @Patch('transactions/:id')
  editTransaction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EditTransactionDto,
  ) {
    return this.portfolioService.editTransaction(user.sub, id, dto);
  }

  @Delete('transactions/:id')
  @HttpCode(204)
  deleteTransaction(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.portfolioService.deleteTransaction(user.sub, id);
  }
}
