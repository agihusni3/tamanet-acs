import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Olt } from './olt.entity';
import { PonPort } from './pon-port.entity';
import { Device } from '../devices/device.entity';

export enum OnuStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export enum OfflineReason {
  LOS = 'LOS', // Loss of Signal / Kabel Optik Putus
  DYING_GASP = 'DYING_GASP', // Mati Listrik di Sisi Pelanggan
  UNKNOWN = 'UNKNOWN',
}

@Entity('onus')
export class Onu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'olt_id' })
  oltId: string;

  @ManyToOne(() => Olt, (olt) => olt.onus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'olt_id' })
  olt: Olt;

  @Column({ name: 'pon_port_id' })
  ponPortId: string;

  @ManyToOne(() => PonPort, (p) => p.onus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pon_port_id' })
  ponPort: PonPort;

  @Column({ name: 'onu_index', type: 'int' })
  onuIndex: number;

  @Index()
  @Column({ nullable: true, length: 32 })
  mac: string | null;

  @Index()
  @Column({ nullable: true, length: 64 })
  sn: string | null;

  @Column({ nullable: true, length: 100 })
  name: string | null;

  @Column({
    type: 'enum',
    enum: OnuStatus,
    default: OnuStatus.ONLINE,
  })
  status: OnuStatus;

  @Column({
    type: 'enum',
    enum: OfflineReason,
    nullable: true,
  })
  offlineReason: OfflineReason | null;

  @Column({ name: 'rx_power', nullable: true, length: 20 })
  rxPower: string | null;

  @Column({ name: 'tx_power', nullable: true, length: 20 })
  txPower: string | null;

  @Column({ nullable: true, type: 'float' })
  distance: number | null; // Jarak fiber optik dalam meter

  @Column({ name: 'device_id', nullable: true })
  deviceId: string | null;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device: Device | null;

  @Column({ name: 'last_seen', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSeen: Date;
}
