/**
 * 公司Repository
 */

import { BaseRepository } from './base.repository';
import { Company } from '../../core/models/types';

export class CompanyRepository extends BaseRepository<Company> {
  constructor() {
    super('companies', 'id');
  }

  /**
   * 创建公司
   */
  create(id: string, name: string): Company {
    const now = new Date().toISOString();
    this.insert({
      id,
      name,
      created_at: now
    });
    return this.findById(id)!;
  }

  /**
   * 获取默认公司（第一个）
   */
  getDefault(): Company | undefined {
    return this.findAll()[0];
  }
}

export const companyRepository = new CompanyRepository();