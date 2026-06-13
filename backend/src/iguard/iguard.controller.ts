import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { IGuardService } from './iguard.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DeviceReportDto } from './dto/device-report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DeviceTokenGuard } from './guards/device-token.guard';

@ApiTags('iGuard')
@Controller('iguard')
export class IGuardController {
  constructor(private readonly service: IGuardService) {}

  // ─── Stats ───────────────────────────────────────────────────

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get device compliance stats for the organisation' })
  getStats(@CurrentUser('organizationId') orgId: string) {
    return this.service.getOrgStats(orgId);
  }

  // ─── Device list ─────────────────────────────────────────────

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all devices in the organisation' })
  listDevices(@CurrentUser('organizationId') orgId: string) {
    return this.service.listDevices(orgId);
  }

  // ─── My device (employee) ────────────────────────────────────

  @Get('devices/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: "Get the current user's registered device" })
  getMyDevice(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getMyDevice(userId, orgId);
  }

  // ─── Register device (employee) ──────────────────────────────

  @Post('devices/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Register a new device and receive a device token' })
  @ApiResponse({
    status: 201,
    description: 'Returns deviceToken (shown only once) and deviceId',
  })
  registerDevice(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.registerDevice(orgId, userId, dto);
  }

  // ─── Revoke device (admin) ───────────────────────────────────

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a device' })
  revokeDevice(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.revokeDevice(id, orgId);
  }

  // ─── Device detail (admin) ───────────────────────────────────

  @Get('devices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get device detail with last 50 reports' })
  getDevice(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getDevice(id, orgId);
  }

  // ─── Submit report (agent — device token auth) ───────────────

  @Post('report')
  @UseGuards(DeviceTokenGuard)
  @ApiOperation({
    summary: 'Submit a compliance report (agent-auth via device token)',
    description:
      'Authenticate with `Authorization: Bearer <deviceToken>`. No user JWT required.',
  })
  @ApiResponse({ status: 200, description: '{ ok: true }' })
  submitReport(@Body() dto: DeviceReportDto, @Req() req: any) {
    const deviceToken: string = req.device.deviceToken;
    return this.service.submitReport(deviceToken, dto);
  }
}
