import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ length: 100 })
  action: string; // e.g. REBOOT_MODEM, CHANGE_WIFI, FACTORY_RESET, UPDATE_CUSTOMER

  @Column({ name: 'target_type', length: 50 })
  targetType: string; // e.g. DEVICE, CUSTOMER, ASSET

  @Column({ name: 'target_id', nullable: true, length: 100 })
  targetId: string | null;

  @Column({ type: 'jsonb', default: {} })
  detail: Record<string, any>;

  @Column({ nullable: true, length: 50 })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
