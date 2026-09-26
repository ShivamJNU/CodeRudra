import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SubmissionsService } from './submissions/submissions.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockPrisma = {
      pingDatabase: jest.fn().mockResolvedValue({ status: 'OK', database: 'connected' }),
    };
    const mockSubmissionsService = {
      executePublic: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SubmissionsService, useValue: mockSubmissionsService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('ping-db', () => {
    it('should return database ping status', async () => {
      const res = await appController.pingDb();
      expect(res).toEqual({ status: 'OK', database: 'connected' });
    });
  });
});
