import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';

import { ActionItemsService } from '../services/action-items.service';
import { UpdateActionItemDto } from '../dto/update-action-item.dto';

/**
 * Single action item by id (update + delete).
 * Prefix ('action-items') is assigned centrally in app.routes.ts.
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateActionItemDto,
  ) {
    return this.actionItemsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.actionItemsService.remove(id, user.userId);
  }
}
