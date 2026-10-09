import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { PonPort } from './pon-port.entity';
import { Onu } from './onu.entity';

export enum PonType {
  EPON = 'EPON',
  GPON = 'GPON',
}

@Entity('olts')
export class Olt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  vendor: string; // Hioso, Hisfocus/HSGQ, VSOL, dll.

  @Column({ length: 50 })
  model: string;

  @Column({ length: 45 })
  ip: string;

  @Column({ name: 'snmp_community', length: 50, default: 'public' })
  snmpCommunity: string;

  @Column({ name: 'snmp_version', length: 10, default: 'v2c' })
  snmpVersion: string;

  @Column({ name: 'cli_user', nullable: true, length: 50 })
  cliUser: string | null;

  @Column({ name: 'cli_pass', nullable: true, length: 100 })
  cliPass: string | null;

  @Column({
    type: 'enum',
    enum: PonType,
    default: PonType.EPON,
  })
  ponType: PonType;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom: string | null;

  @Column({ name: 'web_port', type: 'int', default: 80 })
  webPort: number;

  @Column({ name: 'cli_port', type: 'int', default: 23 })
  cliPort: number;

  @Column({ name: 'pon_ports_count', type: 'int', default: 2 })
  ponPortsCount: number;

  @Column({ name: 'default_user', length: 50, nullable: true })
  defaultUser: string | null;

  @Column({ name: 'default_pass', length: 100, nullable: true })
  defaultPass: string | null;

  @Column({ length: 50, nullable: true })
  uptime: string | null;

  @OneToMany(() => PonPort, (p) => p.olt, { cascade: true })
  ports: PonPort[];

  @OneToMany(() => Onu, (o) => o.olt, { cascade: true })
  onus: Onu[];
}
