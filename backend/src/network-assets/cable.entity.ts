import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NetworkAsset } from './network-asset.entity';

@Entity('cables')
export class Cable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, default: 'Drop Core' })
  type: string;

  @Column({ name: 'core_count', type: 'int', default: 1 })
  coreCount: number;

  @Column({ name: 'from_asset_id', nullable: true })
  fromAssetId: string | null;

  @ManyToOne(() => NetworkAsset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_asset_id' })
  fromAsset: NetworkAsset | null;

  @Column({ name: 'to_asset_id', nullable: true })
  toAssetId: string | null;

  @ManyToOne(() => NetworkAsset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_asset_id' })
  toAsset: NetworkAsset | null;

  // Garis rute kabel optik (LineString 4326)
  @Column({
    type: 'geography',
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  geom: string | null;
}
