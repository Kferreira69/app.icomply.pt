import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';

/**
 * Prometheus-compatible /metrics endpoint.
 * Uses prom-client if available, falls back to basic JSON.
 * Secured in production by VPS firewall — not exposed externally.
 */
@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {

  @Public()
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics(@Res() res: Response) {
    try {
      const client = require('prom-client') as typeof import('prom-client');
      client.collectDefaultMetrics({ prefix: 'icomply_' });
      const metrics = await client.register.metrics();
      res.set('Content-Type', client.register.contentType);
      res.send(metrics);
    } catch {
      // prom-client not installed — return basic JSON metrics
      const basic = {
        uptime_seconds:     process.uptime(),
        memory_heap_used:   process.memoryUsage().heapUsed,
        memory_heap_total:  process.memoryUsage().heapTotal,
        memory_rss:         process.memoryUsage().rss,
        node_version:       process.version,
        timestamp:          new Date().toISOString(),
      };
      res.json(basic);
    }
  }
}
