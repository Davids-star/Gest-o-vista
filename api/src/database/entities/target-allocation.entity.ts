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
import { TargetPlan } from './target-plan.entity';
import { Shift } from './shift.entity';
import { User } from './user.entity';

@Entity('target_allocations')
@Index('idx_target_allocations_target_plan_id', ['target_plan_id'])
export class TargetAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  target_plan_id: string;

  @ManyToOne(() => TargetPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_plan_id' })
  target_plan: TargetPlan;

  @Column({ type: 'varchar', length: 50 })
  period_type: string;

  @Column({ type: 'date' })
  period_start: string;

  @Column({ type: 'date' })
  period_end: string;

  @Column({ type: 'uuid', nullable: true })
  shift_id: string | null;

  @ManyToOne(() => Shift, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift | null;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 50 })
  generated_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  user: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
