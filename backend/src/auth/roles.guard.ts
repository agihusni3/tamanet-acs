import { SetMetadata, Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Normalisasi role dari frontend (SUPERADMIN, NOC_ENGINEER, TECHNICIAN, HELPDESK)
 * dan backend (ADMIN, NOC, TEKNISI, CS) ke format standar.
 */
function normalizeRole(roleStr: string): UserRole {
  const upper = (roleStr || '').toUpperCase();
  if (upper === 'SUPERADMIN' || upper === 'ADMIN') return UserRole.ADMIN;
  if (upper === 'NOC_ENGINEER' || upper === 'NOC') return UserRole.NOC;
  if (upper === 'TECHNICIAN' || upper === 'TEKNISI') return UserRole.TEKNISI;
  if (upper === 'HELPDESK' || upper === 'CS') return UserRole.CS;
  return UserRole.CS;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 4, // Level 1 (Tertinggi)
  [UserRole.NOC]: 3,   // Level 2
  [UserRole.TEKNISI]: 2, // Level 3
  [UserRole.CS]: 1,    // Level 4 (Read-only / Terendah)
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Akses ditolak: User belum login');
    }

    const userNormalized = normalizeRole(user.role);
    const userLevel = ROLE_HIERARCHY[userNormalized] || 1;

    // Admin / Superadmin memiliki akses universal ke semua endpoint
    if (userNormalized === UserRole.ADMIN) {
      return true;
    }

    // Cek apakah user memiliki salah satu required role atau level hierarki mencukupi
    const minRequiredLevel = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r] || 1));
    const hasExplicitRole = requiredRoles.includes(userNormalized);

    if (!hasExplicitRole && userLevel < minRequiredLevel) {
      throw new ForbiddenException(
        `Akses ditolak: Role akun Anda (${user.role}) tidak memiliki izin untuk tindakan ini. Membutuhkan hak akses [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}

