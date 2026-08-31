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
import { Company } from './company.entity';
import { Machine } from './machine.entity';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('target_plans')
@Index('idx_target_plans_machine_id', ['machine_id'])
@Index('idx_target_plans_company_id', ['company_id'])
export class TargetPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ type: 'varchar', length: 50, default: 'monthly' })
  period_type: string;

  @Column({ type: 'date' })
  period_start: string;

  @Column({ type: 'date' })
  period_end: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
