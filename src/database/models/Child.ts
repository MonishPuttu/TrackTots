import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type ClassModel from './Class';

export default class Child extends Model {
  static table = 'children';

  static associations = {
    classes: { type: 'has_many' as const, foreignKey: 'child_id' },
  };

  @field('name') name!: string;
  @field('date_of_birth') dateOfBirth?: number;
  @field('avatar_uri') avatarUri?: string;
  @field('notes') notes?: string;
  @field('is_active') isActive!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('classes') classes!: Query<ClassModel>;

  /**
   * Calculate the child's age based on date of birth
   */
  get age(): number | null {
    if (!this.dateOfBirth) {
      return null;
    }
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
