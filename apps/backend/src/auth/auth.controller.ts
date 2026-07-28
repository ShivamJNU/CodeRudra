import { Controller, Get, Post, Body, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  // 1. Google OAuth GET redirect
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {
    // Initiates the Google OAuth flow
  }

  // 2. Google OAuth callback redirecting to frontend
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const { accessToken } = await this.authService.generateToken(req.user);
    let frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    if (frontendUrl.endsWith('/')) {
      frontendUrl = frontendUrl.slice(0, -1);
    }
    // Redirect user to frontend success page with token
    return res.redirect(`${frontendUrl}/auth-success?token=${accessToken}`);
  }

  // 3. Google OAuth token exchange (POST /auth/google)
  @Post('google')
  async googleAuthPost(@Body('token') googleAccessToken: string, @Res() res: any) {
    if (!googleAccessToken) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Google access token is required' });
    }

    // Zero-config developer bypass for local testing
    if (googleAccessToken === 'dev-token') {
      const user = await this.authService.validateUser(
        'dev-google-id-12345',
        'developer@coderudra.ai',
        'CodeRudra Developer',
        'https://api.dicebear.com/7.x/bottts/svg?seed=CodeRudra',
      );
      const tokenObj = await this.authService.generateToken(user);
      return res.status(HttpStatus.OK).json(tokenObj);
    }

    try {
      // Validate the token against Google UserInfo API
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });

      const { sub: googleId, email, name, picture } = response.data;
      if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Failed to retrieve email from Google profile' });
      }

      const user = await this.authService.validateUser(googleId, email, name, picture);
      const tokenObj = await this.authService.generateToken(user);
      return res.status(HttpStatus.OK).json(tokenObj);
    } catch (error: any) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid Google OAuth Token',
        error: error.message || error,
      });
    }
  }

  // 4. Logout endpoint
  @Post('logout')
  async logout(@Res() res: any) {
    return res.status(HttpStatus.OK).json({ success: true, message: 'Logged out successfully' });
  }

  // 5. Get current user profile (GET /auth/me or GET /me)
  // Let's add GET /me at controller root path too if requested, but `/auth/me` is clean.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return req.user;
  }
}
