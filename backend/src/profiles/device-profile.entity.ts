import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface DeviceProfileParams {
  ssid24?: string;
  ssid5?: string;
  wifiPass24?: string;
  wifiPass5?: string;
  wifiEnable24?: string;
  wifiEnable5?: string;
  rxPower?: string;
  txPower?: string;
  pppoeUser?: string;
  pppoePass?: string;
  wanIP?: string;
  wanVlan?: string;
  reboot?: string;
  factoryReset?: string;
  hosts?: string;
  uptime?: string;
  [key: string]: string | undefined;
}

export interface DeviceProfileCapabilities {
  reboot: boolean;
  factoryReset: boolean;
  wifi: boolean;
  wifi5g: boolean;
  pppoe: boolean;
  firmware: boolean;
  ping: boolean;
  traceroute: boolean;
  hosts: boolean;
  rxPower: boolean;
  [key: string]: boolean | undefined;
}

@Entity('device_profiles')
@Index(['oui', 'productClass'])
export class DeviceProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  manufacturer: string;

  @Column({ length: 64 })
  oui: string;

  @Column({ name: 'product_class', length: 100 })
  productClass: string;

  @Column({ name: 'firmware_pattern', nullable: true, length: 100 })
  firmwarePattern: string | null;

  @Column({ name: 'root_model', length: 20, default: 'TR098' })
  rootModel: 'TR098' | 'TR181';

  @Column({ type: 'jsonb', default: {} })
  params: DeviceProfileParams;

  @Column({ type: 'jsonb', default: {} })
  capabilities: DeviceProfileCapabilities;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
