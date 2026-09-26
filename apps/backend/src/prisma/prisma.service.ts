import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      console.log('Successfully connected to the database.');
    } catch (err: any) {
      this.isConnected = false;
      console.warn('\n⚠️  WARNING: Could not connect to the database. Running in in-memory mockup mode.');
      console.warn(`Error Details: ${err.message || err}\n`);
    }
  }

  async pingDatabase() {
    try {
      // Execute a real SQL query against Supabase PostgreSQL to prevent inactivity pause
      const pingResult: any = await this.$queryRaw`SELECT 1 as ping, NOW() as server_time`;
      this.isConnected = true;

      // Also touch the Problem table to ensure table-level query activity
      const problemCount = await this.problem.count().catch(() => 0);

      return {
        status: 'OK',
        database: 'connected',
        serverTime: pingResult?.[0]?.server_time || new Date(),
        problemCount,
      };
    } catch (err: any) {
      console.warn('Database ping query failed:', err.message || err);
      return {
        status: 'DEGRADED',
        database: 'error',
        error: err.message || 'Database unavailable',
        timestamp: new Date(),
      };
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
