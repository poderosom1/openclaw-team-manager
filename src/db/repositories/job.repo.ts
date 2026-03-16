/**
 * 职业Repository
 */

import { BaseRepository } from './base.repository';
import { Job } from '../../core/models/types';
import { safeJsonStringify } from '../../core/utils';

export class JobRepository extends BaseRepository<Job> {
  constructor() {
    super('jobs', 'id');
  }

  /**
   * 创建职业
   */
  create(data: {
    id: string;
    name: string;
    skill_pack_ids?: string[];
  }): Job {
    const now = new Date().toISOString();
    this.insert({
      id: data.id,
      name: data.name,
      skill_pack_ids: data.skill_pack_ids ? safeJsonStringify(data.skill_pack_ids) : null,
      created_at: now
    });
    return this.findById(data.id)!;
  }

  /**
   * 更新职业
   */
  updateJob(id: string, data: { name?: string; skill_pack_ids?: string[] }): void {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.skill_pack_ids !== undefined) {
      updateData.skill_pack_ids = safeJsonStringify(data.skill_pack_ids);
    }
    
    if (Object.keys(updateData).length > 0) {
      this.update(id, updateData);
    }
  }

  /**
   * 获取职业关联的技能包ID列表
   */
  getSkillPackIds(jobId: string): string[] {
    const job = this.findById(jobId);
    if (!job || !job.skill_pack_ids) return [];
    try {
      return JSON.parse(job.skill_pack_ids);
    } catch {
      return [];
    }
  }
}

export const jobRepository = new JobRepository();