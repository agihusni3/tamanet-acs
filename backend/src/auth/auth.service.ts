import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, pass: string) {
    const user = await this.userRepo.findOne({ where: { username, active: true } });
    if (!user) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.userRepo.findOne({ where: { id: decoded.sub, active: true } });
      if (!user) {
        throw new UnauthorizedException('User tidak ditemukan');
      }

      const payload = { sub: user.id, username: user.username, role: user.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau telah kadaluarsa');
    }
  }

  async createAdminIfNotExists(): Promise<void> {
    const adminCount = await this.userRepo.count();
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      const admin = this.userRepo.create({
        username: 'admin',
        passwordHash: hash,
        role: UserRole.ADMIN,
        active: true,
      });
      await this.userRepo.save(admin);
    }
  }
}
