/**
 * Skill Pack Repository
 */

import { BaseRepository } from './base.repository';
import { SkillPack, SkillPackContent } from '../../core/models/types';
import { safeJsonParse, safeJsonStringify } from '../../core/utils';

export class SkillPackRepository extends BaseRepository<SkillPack> {
  constructor() {
    super('skill_packs', 'id');
  }

  /**
   * Create skill pack
   */
  create(data: {
    id: string;
    name: string;
    description: string;
    content: string;  // JSON string or file path
  }): SkillPack {
    const now = new Date().toISOString();
    
    // If content is file path, read file content
    let contentStr = data.content;
    // For now assume content is already JSON string
    
    this.insert({
      id: data.id,
      name: data.name,
      description: data.description,
      content: contentStr,
      version: '1.0.0',
      created_at: now,
      updated_at: now
    });
    
    return this.findById(data.id)!;
  }

  /**
   * Update skill pack
   */
  updateSkillPack(id: string, data: {
    name?: string;
    description?: string;
    content?: string;
    version?: string;
  }): void {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.version !== undefined) updateData.version = data.version;
    
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      this.update(id, updateData);
    }
  }

  /**
   * Get skill pack content (parse JSON)
   */
  getContent(id: string): SkillPackContent | null {
    const skillPack = this.findById(id);
    if (!skillPack || !skillPack.content) return null;
    
    try {
      const parsed = JSON.parse(skillPack.content);
      // Add skill pack basic info to return object
      return {
        skill_pack_id: skillPack.id,
        name: skillPack.name,
        version: skillPack.version,
        description: skillPack.description || '',
        ...parsed
      };
    } catch {
      return null;
    }
  }
}

export const skillPackRepository = new SkillPackRepository();