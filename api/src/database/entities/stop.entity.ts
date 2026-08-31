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
import { ProductionSession } from './production-session.entity';
import { PossibleStop } from './possible-stop.entity';
import { User } from './user.entity';
import { StopReason } from './stop-reason.entity';

export enum StopStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('stops')
@Index('idx_stops_machine_id', ['machine_id'])
@Index('idx_stops_started_at', ['started_at'])
@Index('idx_stops_status', ['status'])
export class Stop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  session_id: string | null;

  @ManyToOne(() => ProductionSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: ProductionSession | null;

  @Column({ type: 'uuid', nullable: true })
  possible_stop_id: string | null;

  @ManyToOne(() => PossibleStop, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'possible_stop_id' })
  possible_stop: PossibleStop | null;

  @Column({ type: 'uuid' })
  operator_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ type: 'uuid' })
  reason_id: string;

  @ManyToOne(() => StopReason, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reason_id' })
  reason: StopReason;

  @Column({ type: 'text', nullable: true })
  observation: string | null;

  @Column({ type: 'timestamptz' })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;

  @Column({ type: 'int', nullable: true })
  duration_seconds: number | null;

  @Column({ type: 'varchar', length: 50, default: StopStatus.OPEN })
  status: StopStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
