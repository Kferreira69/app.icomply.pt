import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TranslationsService {
  private readonly deeplApiKey: string | undefined;
  private readonly deeplApiUrl = 'https://api.deepl.com/v2/translate'; // PRO endpoint

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.deeplApiKey = this.config.get<string>('DEEPL_API_KEY');
  }

  // ── DeepL Translation ──────────────────────────────────────────

  // Map locale codes to DeepL language codes (source always EN)
  private toDeeplCode(locale: string): string {
    const map: Record<string, string> = {
      pt: 'PT-PT',
      en: 'EN-GB',
      fr: 'FR',
      es: 'ES',
    };
    return map[locale.toLowerCase()] ?? locale.toUpperCase();
  }

  async translate(
    text: string | string[],
    targetLang: string,
    sourceLang = 'EN',
  ): Promise<string[]> {
    if (!this.deeplApiKey) {
      throw new InternalServerErrorException(
        'DEEPL_API_KEY is not configured. Add it to your .env file.',
      );
    }

    const texts = Array.isArray(text) ? text : [text];

    const body = new URLSearchParams();
    body.append('auth_key', this.deeplApiKey);
    body.append('target_lang', this.toDeeplCode(targetLang));
    body.append('source_lang', this.toDeeplCode(sourceLang));
    texts.forEach(t => body.append('text', t));

    const response = await fetch(this.deeplApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `DeepL API error ${response.status}: ${errorText}`,
      );
    }

    const result = await response.json() as { translations: { text: string }[] };
    return result.translations.map(t => t.text);
  }

  async translateOne(text: string, targetLang: string, sourceLang = 'EN'): Promise<string> {
    const [translated] = await this.translate(text, targetLang, sourceLang);
    return translated;
  }

  // ── TranslationOverride CRUD ──────────────────────────────────

  async listOverrides(locale?: string) {
    return this.prisma.translationOverride.findMany({
      where: locale ? { locale } : undefined,
      orderBy: [{ locale: 'asc' }, { key: 'asc' }],
    });
  }

  async upsertOverride(locale: string, key: string, value: string, userId?: string) {
    return this.prisma.translationOverride.upsert({
      where: { locale_key: { locale, key } },
      create: { locale, key, value, updatedBy: userId },
      update: { value, updatedBy: userId },
    });
  }

  async deleteOverride(locale: string, key: string) {
    return this.prisma.translationOverride.deleteMany({
      where: { locale, key },
    });
  }

  async getOverridesMap(locale: string): Promise<Record<string, string>> {
    const overrides = await this.prisma.translationOverride.findMany({
      where: { locale },
    });
    return overrides.reduce((map, o) => ({ ...map, [o.key]: o.value }), {});
  }

  // ── Translate + auto-save override ────────────────────────────

  async translateAndSave(
    key: string,
    text: string,
    targetLang: string,
    userId?: string,
  ): Promise<string> {
    const translated = await this.translateOne(text, targetLang);
    await this.upsertOverride(targetLang.toLowerCase(), key, translated, userId);
    return translated;
  }
}
