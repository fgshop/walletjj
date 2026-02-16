import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { Request } from 'express';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'List all users' })
  async listUsers(@Query() query: AdminQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':id')
  @AdminRoles('OPERATOR' as any)
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Post(':id/suspend')
  @AdminRoles('ADMIN' as any)
  @ApiOperation({ summary: 'Suspend a user' })
  async suspendUser(
    @CurrentAdmin('id') adminId: string,
    @Param('id') userId: string,
    @Body('reason') reason: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.suspendUser(adminId, userId, reason, req.ip || '');
  }

  @Post(':id/activate')
  @AdminRoles('ADMIN' as any)
  @ApiOperation({ summary: 'Activate a suspended user' })
  async activateUser(
    @CurrentAdmin('id') adminId: string,
    @Param('id') userId: string,
    @Req() req: Request,
  ) {
    return this.adminUsersService.activateUser(adminId, userId, req.ip || '');
  }
}
