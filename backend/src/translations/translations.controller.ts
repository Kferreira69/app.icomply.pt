import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TranslationsService } from './translations.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  // Public: load merged messages for a locale (base JSON + overrides)
  @Get('overrides')
  getOverridesMap(@Query('locale') locale = 'en') {
    return this.translationsService.getOverridesMap(locale);
  }

  // Protected: full admin access
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('translations', 1)
  listOverrides(@Query('locale') locale?: string) {
    return this.translationsService.listOverrides(locale);
  }

  @Put(':locale/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('translations', 2)
  upsertOverride(
    @Param('locale') locale: string,
    @Param('key') key: string,
    @Body() body: { value: string },
    @Request() req: any,
  ) {
    return this.translationsService.upsertOverride(locale, key, body.value, req.user?.id);
  }

  @Delete(':locale/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('translations', 2)
  deleteOverride(@Param('locale') locale: string, @Param('key') key: string) {
    return this.translationsService.deleteOverride(locale, key);
  }

  // DeepL translate a single key
  @Post('translate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('translations', 2)
  async translate(
    @Body() body: { key: string; text: string; targetLang: string; save?: boolean },
    @Request() req: any,
  ) {
    if (body.save) {
      const translated = await this.translationsService.translateAndSave(
        body.key, body.text, body.targetLang, req.user?.id,
      );
      return { translated };
    }
    const translated = await this.translationsService.translateOne(body.text, body.targetLang);
    return { translated };
  }

  // DeepL translate multiple texts at once
  @Post('translate/batch')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('translations', 2)
  async translateBatch(
    @Body() body: { texts: string[]; targetLang: string; sourceLang?: string },
  ) {
    const results = await this.translationsService.translate(
      body.texts, body.targetLang, body.sourceLang,
    );
    return { results };
  }
}
