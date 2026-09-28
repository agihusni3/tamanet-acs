import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('coverage_areas')
export class CoverageArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  // Poligon area jangkauan / RW / Desa (Polygon 4326)
  @Column({
    type: 'geography',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  geom: string | null;
}
