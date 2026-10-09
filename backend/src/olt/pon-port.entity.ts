import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Olt } from './olt.entity';
import { Onu } from './onu.entity';

@Entity('pon_ports')
export class PonPort {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'olt_id' })
  oltId: string;

  @ManyToOne(() => Olt, (olt) => olt.ports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'olt_id' })
  olt: Olt;

  @Column({ type: 'int', default: 1 })
  slot: number;

  @Column({ type: 'int' })
  port: number;

  @Column({ length: 50, default: 'EPON0/1' })
  label: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @OneToMany(() => Onu, (onu) => onu.ponPort)
  onus: Onu[];
}
