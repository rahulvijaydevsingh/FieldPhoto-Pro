import { subscribePhotos, savePhotoToFirestore, deletePhotoFromFirestore } from '../services/firebase';
import { Photo } from '../types';

export const photoRepository = {
  subscribe: (onUpdate: (photos: Photo[]) => void) => subscribePhotos(onUpdate),
  save: (photo: Photo) => savePhotoToFirestore(photo),
  delete: (id: string) => deletePhotoFromFirestore(id),
};
