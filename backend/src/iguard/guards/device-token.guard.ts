import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DeviceTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Device token missing');
    }

    const token = authHeader.slice(7).trim();

    const device = await this.prisma.deviceAgent.findUnique({
      where: { deviceToken: token },
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }

    if (device.status === 'REVOKED') {
      throw new UnauthorizedException('Device has been revoked');
    }

    // Attach device to request for use in controller
    request.device = device;
    return true;
  }
}
