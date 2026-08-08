import { Photo } from '../types';

export function isLeadPhoto(photo: Photo): boolean {
  if (photo.photoType) {
    return photo.photoType === 'lead';
  }

  return true;
}
