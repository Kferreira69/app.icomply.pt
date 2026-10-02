import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { LicensingService } from '../licensing/licensing.service';
import { PublicCatalogService } from './public-catalog.service';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './leads.dto';

/** Public endpoints for the marketing site (no authentication). */
@Public()
@Controller('public')
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService, private readonly leads: LeadsService) {}

  /** What the product offers today, by governance domain. The website reads this instead of hard-coding it. */
  @Get('catalog')
  @Header('Cache-Control', 'public, max-age=300')
  getCatalog() {
    return this.catalog.get();
  }

  /** Demo / contact / feature-request / newsletter forms on the website. */
  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 5, ttl: 600000 } }) // 5 submissions / 10 min per IP
  createLead(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }
}

/** Backoffice view of the leads — Contemporary Constellation super-admins only. */
@UseGuards(JwtAuthGuard)
@Controller('backoffice/leads')
export class LeadsAdminController {
  constructor(private readonly leads: LeadsService, private readonly licensing: LicensingService) {}

  @Get()
  async list(@Request() req: any, @Query('status') status?: string, @Query('type') type?: string) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.leads.list({ status, type });
  }

  /** GDPR erasure on request: every lead of one email (in the body: an address in the URL would end up in access logs). */
  @Post('erase')
  @HttpCode(HttpStatus.OK)
  async removeByEmail(@Request() req: any, @Body() body: { email?: string }) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.leads.removeByEmail(body?.email ?? '');
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.leads.remove(id);
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.leads.update(id, dto);
  }
}
