import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeviceProfile } from '../profiles/device-profile.entity';
import { Customer } from '../customers/customer.entity';

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ALARM = 'ALARM',
  UNKNOWN = 'UNKNOWN',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'genie_id', length: 120 })
  genieId: string;

  @Index()
  @Column({ length: 64 })
  serial: string;

  @Index()
  @Column({ nullable: true, length: 32 })
  mac: string | null;

  @Column({ length: 32 })
  oui: string;

  @Column({ name: 'product_class', length: 64 })
  productClass: string;

  @Column({ length: 64 })
  manufacturer: string;

  @Column({ nullable: true, length: 64 })
  model: string | null;

  @Column({ nullable: true, length: 64 })
  firmware: string | null;

  @Column({ name: 'profile_id', nullable: true })
  profileId: string | null;

  @ManyToOne(() => DeviceProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'profile_id' })
  profile: DeviceProfile | null;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'wan_ip', nullable: true, length: 45 })
  wanIp: string | null;

  @Column({ type: 'int', default: 0 })
  uptime: number;

  @Column({ name: 'rx_power_acs', nullable: true, length: 20 })
  rxPowerAcs: string | null;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.UNKNOWN,
  })
  status: DeviceStatus;

  @Column({ name: 'last_inform', nullable: true, type: 'timestamp' })
  lastInform: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
