import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(googleId: string, email: string, name: string, profileImage?: string) {
    if (!this.prisma.isConnected) {
      return {
        id: 'dev-user-id',
        googleId,
        name,
        email,
        profileImage: profileImage || null,
        createdAt: new Date(),
      };
    }

    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      // Also check if email exists to link account or avoid conflict
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Update user with googleId
        user = await this.prisma.user.update({
          where: { email },
          data: { googleId, profileImage: profileImage || existingUser.profileImage },
        });
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            googleId,
            email,
            name,
            profileImage,
          },
        });
      }
    }

    return user;
  }

  async generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, name: user.name, image: user.profileImage };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
