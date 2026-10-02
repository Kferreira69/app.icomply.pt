import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search every module the caller can read',
    description:
      'Accent/case-insensitive, typo-tolerant, matches every word anywhere in the content. ' +
      'Results are tiered: exact (all words found), partial (some words) and related (same concept).',
  })
  search(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Math.max(parseInt(limit ?? '', 10) || 30, 1), 100);
    // ?q=a&q=b arrives as an array: only a plain string is a query
    return this.service.search(userId, orgId, typeof q === 'string' ? q : '', n);
  }
}
