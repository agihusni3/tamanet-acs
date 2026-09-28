import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NetworkAsset } from '../network-assets/network-asset.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_no', unique: true, length: 50 })
  customerNo: string;

  @Column({ length: 150 })
  name: string;

  @Column({ nullable: true, length: 30 })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'odp_id', nullable: true })
  odpId: string | null;

  @ManyToOne(() => NetworkAsset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'odp_id' })
  odp: NetworkAsset | null;

  // Koordinat geografis GIS untuk peta (Point 4326)
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
