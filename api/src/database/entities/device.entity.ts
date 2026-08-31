import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Machine } from './machine.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Index('idx_devices_identifier', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  identifier: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secret_hash: string | null;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any> | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at: Date | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
