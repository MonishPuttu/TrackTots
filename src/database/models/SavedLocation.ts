import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class SavedLocation extends Model {
  static table = 'saved_locations';

  @field('name') name!: string;
  @field('address') address?: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('category') category!: string;
  @field('notes') notes?: string;
  @field('is_favorite') isFavorite!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
