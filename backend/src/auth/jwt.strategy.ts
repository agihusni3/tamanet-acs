import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { getJwtSecret } from '../common/security-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    const user = await this.userRepo.findOne({ where: { id: payload.sub, active: true } });
    if (!user) {
      throw new UnauthorizedException('Sesi tidak valid atau akun dinonaktifkan');
    }

    // Mitigasi ATK-04 & VULN-13: Validasi tokenVersion untuk pembatalan instan Access Token
    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== undefined &&
      payload.tokenVersion !== user.tokenVersion
    ) {
      throw new UnauthorizedException('Sesi telah dicabut (logout atau pergantian password). Silakan login kembali.');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}
