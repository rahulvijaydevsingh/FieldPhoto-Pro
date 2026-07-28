import { saveRouteBreadcrumbToFirestore, subscribeRouteBreadcrumbs } from '../services/firebase';
import { RouteBreadcrumb } from '../types';
import { bufferingManager } from '../system/buffering/BufferingManager';

export const breadcrumbRepository = {
  save: async (breadcrumb: RouteBreadcrumb) => {
    const result = await bufferingManager.saveOrBuffer(
      'breadcrumb',
      breadcrumb,
      async (data) => {
        await saveRouteBreadcrumbToFirestore(data);
        return true;
      }
    );
    return result;
  },
  subscribe: (callback: (crumbs: RouteBreadcrumb[]) => void) => subscribeRouteBreadcrumbs(callback),
};
