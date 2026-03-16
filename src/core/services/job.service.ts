/**
 * Job Service
 */

import { jobRepository } from '../../db/repositories/job.repo';
import { Job } from '../models/types';
import { generateJobId } from '../utils';

export class JobService {
  /**
   * 创建职业
   */
  create(data: {
    id?: string;
    name: string;
    skill_pack_ids?: string[];
  }): { success: boolean; job?: Job; message: string } {
    try {
      const jobId = data.id || generateJobId();
      const job = jobRepository.create({
        id: jobId,
        name: data.name,
        skill_pack_ids: data.skill_pack_ids
      });
      return { success: true, job, message: '职业创建成功' };
    } catch (error) {
      return { success: false, message: `创建失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 获取职业
   */
  getById(id: string): Job | undefined {
    return jobRepository.findById(id);
  }

  /**
   * 列出所有职业
   */
  listAll(): Job[] {
    return jobRepository.findAll();
  }

  /**
   * 更新职业
   */
  update(id: string, data: { name?: string; skill_pack_ids?: string[] }): void {
    jobRepository.updateJob(id, data);
  }

  /**
   * 删除职业
   */
  delete(id: string): { success: boolean; message: string } {
    const job = jobRepository.findById(id);
    if (!job) {
      return { success: false, message: '职业不存在' };
    }

    jobRepository.delete(id);
    return { success: true, message: '职业已删除' };
  }

  /**
   * 获取职业关联的技能包ID列表
   */
  getSkillPackIds(jobId: string): string[] {
    return jobRepository.getSkillPackIds(jobId);
  }
}

export const jobService = new JobService();