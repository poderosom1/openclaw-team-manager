/**
 * Department (Team) Repository
 */

import { BaseRepository } from './base.repository';
import { Department } from '../../core/models/types';
import { generateDeptId } from '../../core/utils';

export class DepartmentRepository extends BaseRepository<Department> {
  constructor() {
    super('departments', 'id');
  }

  /**
   * Create department (team)
   */
  create(id: string, name: string): Department {
    this.insert({
      id,
      name,
      company_id: null,
      feishu_group_id: null,
      created_at: new Date().toISOString()
    });
    return this.findById(id)!;
  }

  /**
   * Update department (team)
   */
  updateDept(id: string, data: { name?: string; feishu_group_id?: string | null }): void {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.feishu_group_id !== undefined) updateData.feishu_group_id = data.feishu_group_id;
    
    if (Object.keys(updateData).length > 0) {
      this.update(id, updateData);
    }
  }

  /**
   * Get all departments (teams)
   */
  findAll(): Department[] {
    return this.db.prepare('SELECT * FROM departments ORDER BY name').all() as Department[];
  }

  /**
   * Get department by ID
   */
  findById(id: string): Department | undefined {
    return this.db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as Department | undefined;
  }

  /**
   * Check if department exists
   */
  exists(id: string): boolean {
    const result = this.db.prepare('SELECT 1 FROM departments WHERE id = ?').get(id);
    return !!result;
  }

  /**
   * Delete department (team)
   */
  deleteDept(id: string): void {
    this.delete(id);
  }
}

export const departmentRepository = new DepartmentRepository();