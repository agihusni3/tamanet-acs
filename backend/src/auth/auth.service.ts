import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { getJwtSecret, getJwtRefreshSecret } from '../common/security-config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  // Dummy hash konstan untuk mitigasi VULN-15 (Timing Attack / User Enumeration)
  private readonly DUMMY_HASH = '$2b$12$K8qM2p7e9w0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s.';

  async login(username: string, pass: string) {
    const user = await this.userRepo.findOne({ where: { username, active: true } });
    if (!user) {
      // Jalankan dummy hashing agar durasi respon identik dan mencegah enumerasi username
      await bcrypt.compare(pass, this.DUMMY_HASH).catch(() => false);
      throw new UnauthorizedException('Username atau password salah');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: getJwtSecret(),
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    // Refresh token menggunakan secret TERPISAH dan tokenVersion untuk pembatalan instan
    const refreshToken = this.jwtService.sign(payload, {
      secret: getJwtRefreshSecret(),
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

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
      // Verifikasi menggunakan REFRESH secret, bukan access secret
      const decoded = this.jwtService.verify(token, {
        secret: getJwtRefreshSecret(),
      });
      const user = await this.userRepo.findOne({ where: { id: decoded.sub, active: true } });
      if (!user) {
        throw new UnauthorizedException('User tidak ditemukan');
      }

      // Mitigasi ATK-04: Cek token version jika user telah logout atau password diganti
      if (
        decoded.tokenVersion !== undefined &&
        user.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion
      ) {
        throw new UnauthorizedException('Sesi refresh token telah dicabut. Silakan login kembali.');
      }

      const payload = {
        sub: user.id,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion || 0,
      };
      const accessToken = this.jwtService.sign(payload, {
        secret: getJwtSecret(),
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      });
      return { accessToken };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Refresh token tidak valid atau telah kadaluarsa');
    }
  }

  /**
   * Membatalkan semua token aktif untuk pengguna ini (misal saat logout atau pergantian password)
   */
  async revokeUserTokens(userId: string): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'tokenVersion', 1);
  }

  async createAdminIfNotExists(): Promise<void> {
    const adminCount = await this.userRepo.count();
    if (adminCount === 0) {
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(initialPassword, salt);
      const admin = this.userRepo.create({
        username: 'admin',
        passwordHash: hash,
        role: UserRole.ADMIN,
        active: true,
      });
      await this.userRepo.save(admin);
      if (!process.env.ADMIN_INITIAL_PASSWORD) {
        console.warn('⚠️ [SECURITY AUDIT ALERT] Akun default admin diinisialisasi dengan password bawaan ("admin123"). SEGERA GANTI PASSWORD INI DI PRODUCTION!');
      }
    }
  }
}
