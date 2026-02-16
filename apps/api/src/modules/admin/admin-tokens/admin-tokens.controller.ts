import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminTokensService } from './admin-tokens.service';
import { AuditService } from '../../audit/audit.service';
import { CreateTokenDto, UpdateTokenDto } from '../dto/manage-token.dto';
import { Request } from 'express';

@ApiTags('Admin - Tokens')
@ApiBearerAuth()
@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/tokens')
export class AdminTokensController {
  constructor(
    private readonly adminTokensService: AdminTokensService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @AdminRoles('ADMIN' as any)
  @ApiOperation({ summary: 'List supported tokens' })
  async listTokens() {
    return this.adminTokensService.listTokens();
  }

  @Post()
  @AdminRoles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Add a supported token' })
  async createToken(
    @CurrentAdmin('id') adminId: string,
    @Body() dto: CreateTokenDto,
    @Req() req: Request,
  ) {
    const token = await this.adminTokensService.createToken(dto);
    await this.auditService.log(adminId, 'CREATE_TOKEN', 'SupportedToken', token.id, { symbol: dto.symbol, contractAddress: dto.contractAddress }, req.ip || '');
    return token;
  }

  @Patch(':id')
  @AdminRoles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Update a supported token' })
  async updateToken(
    @CurrentAdmin('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTokenDto,
    @Req() req: Request,
  ) {
    const token = await this.adminTokensService.updateToken(id, dto);
    await this.auditService.log(adminId, 'UPDATE_TOKEN', 'SupportedToken', id, dto, req.ip || '');
    return token;
  }

  @Delete(':id')
  @AdminRoles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Delete a supported token' })
  async deleteToken(
    @CurrentAdmin('id') adminId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.adminTokensService.deleteToken(id);
    await this.auditService.log(adminId, 'DELETE_TOKEN', 'SupportedToken', id, null, req.ip || '');
    return { message: 'Token deleted' };
  }
}
