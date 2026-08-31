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
import { Product } from './product.entity';
import { Machine } from './machine.entity';

@Entity('lots')
@Index('idx_lots_company_id', ['company_id'])
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
