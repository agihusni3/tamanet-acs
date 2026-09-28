import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum AssetType {
  ODC = 'ODC',
  ODP = 'ODP',
  TIANG = 'TIANG',
  JOINT_CLOSURE = 'JOINT_CLOSURE',
}

@Entity('network_assets')
export class NetworkAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AssetType,
  })
  type: AssetType;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int', default: 8 })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  used: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => NetworkAsset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: NetworkAsset | null;

  // Koordinat geografis GIS tiang/ODC/ODP (Point 4326)
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
