import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockUserRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((u) => u),
      save: jest.fn(async (u) => u),
    };
    mockJwtService = {
      sign: jest.fn(() => 'mock_jwt_token_12345'),
      verify: jest.fn(),
    };

    service = new AuthService(mockUserRepo, mockJwtService);
  });

  it('harus berhasil login ketika username dan password benar', async () => {
    const rawPass = 'PasswordNoc2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPass, salt);

    const mockUser = new User();
    mockUser.id = 'user-uuid-1';
    mockUser.username = 'admin';
    mockUser.passwordHash = hash;
    mockUser.role = UserRole.ADMIN;
    mockUser.active = true;

    mockUserRepo.findOne.mockResolvedValue(mockUser);

    const res = await service.login('admin', rawPass);

    expect(res).toBeDefined();
    expect(res.accessToken).toBe('mock_jwt_token_12345');
    expect(res.refreshToken).toBe('mock_jwt_token_12345');
    expect(res.user.username).toBe('admin');
    expect(res.user.role).toBe(UserRole.ADMIN);
  });

  it('harus menolak login (UnauthorizedException) jika password salah', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('CorrectPassword', salt);

    const mockUser = new User();
    mockUser.id = 'user-uuid-2';
    mockUser.username = 'admin';
    mockUser.passwordHash = hash;
    mockUser.active = true;

    mockUserRepo.findOne.mockResolvedValue(mockUser);

    await expect(service.login('admin', 'WrongPassword')).rejects.toThrow(UnauthorizedException);
  });

  it('harus menolak login jika user tidak aktif atau tidak ditemukan', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);

    await expect(service.login('unknown_user', 'any_pass')).rejects.toThrow(UnauthorizedException);
  });
});
