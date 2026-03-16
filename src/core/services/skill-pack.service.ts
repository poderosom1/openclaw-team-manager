/**
 * 技能包服务
 */

import { skillPackRepository } from '../../db/repositories/skill-pack.repo';
import { SkillPack, SkillPackContent } from '../models/types';
import { generateSkillPackId } from '../utils';

export class SkillPackService {
  /**
   * 创建技能包
   */
  create(data: {
    id?: string;
    name: string;
    description: string;
    content: string;
    version?: string;
  }): { success: boolean; skillPack?: SkillPack; message: string } {
    try {
      const skillPackId = data.id || generateSkillPackId();
      const skillPack = skillPackRepository.create({
        id: skillPackId,
        name: data.name,
        description: data.description,
        content: data.content
      });
      return { success: true, skillPack, message: '技能包创建成功' };
    } catch (error) {
      return { success: false, message: `创建失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 获取技能包
   */
  getById(id: string): SkillPack | undefined {
    return skillPackRepository.findById(id);
  }

  /**
   * 列出所有技能包
   */
  listAll(): SkillPack[] {
    return skillPackRepository.findAll();
  }

  /**
   * 更新技能包
   */
  update(id: string, data: {
    name?: string;
    description?: string;
    content?: string;
    version?: string;
  }): void {
    skillPackRepository.updateSkillPack(id, data);
  }

  /**
   * 删除技能包
   */
  delete(id: string): { success: boolean; message: string } {
    const skillPack = skillPackRepository.findById(id);
    if (!skillPack) {
      return { success: false, message: '技能包不存在' };
    }

    skillPackRepository.delete(id);
    return { success: true, message: '技能包已删除' };
  }

  /**
   * 获取技能包内容（解析JSON）
   */
  getContent(id: string): SkillPackContent | null {
    return skillPackRepository.getContent(id);
  }
}

export const skillPackService = new SkillPackService();