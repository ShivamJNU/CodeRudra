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

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
