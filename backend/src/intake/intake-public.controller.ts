import { Controller, Get, Post, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { IntakeService } from './intake.service';

@Controller('public/intake')
export class IntakePublicController {
  constructor(private readonly service: IntakeService) {}

  @Get(':token')
  getForm(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/submit')
  @HttpCode(HttpStatus.CREATED)
  submit(
    @Param('token') token: string,
    @Body() body: { answers: Record<string, any>; submitterName?: string; submitterEmail?: string },
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    return this.service.submitPublic(token, { ...body, ipAddress: ip });
  }
}
