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
import { Stop } from './stop.entity';
import { User } from './user.entity';

export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Entity('alerts')
@Index('idx_alerts_machine_id', ['machine_id'])
@Index('idx_alerts_status', ['status'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  stop_id: string | null;

  @ManyToOne(() => Stop, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'stop_id' })
  stop: Stop | null;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'varchar', length: 50 })
  priority: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 50, default: AlertStatus.OPEN })
  status: AlertStatus;

  @Column({ type: 'timestamptz' })
  triggered_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledged_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  acknowledged_by: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledged_by_user: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
