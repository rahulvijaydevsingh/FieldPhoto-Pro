import { subscribeRecycleBin, saveRecycleItemToFirestore, deleteRecycleItemFromFirestore, deleteAllRecycleItemsFromFirestore } from '../services/firebase';
import { RecycleItem } from '../types';

export const recycleRepository = {
  subscribe: (onUpdate: (items: RecycleItem[]) => void) => subscribeRecycleBin(onUpdate),
  save: (item: RecycleItem) => saveRecycleItemToFirestore(item),
  delete: (id: string) => deleteRecycleItemFromFirestore(id),
  deleteAll: () => deleteAllRecycleItemsFromFirestore(),
};
