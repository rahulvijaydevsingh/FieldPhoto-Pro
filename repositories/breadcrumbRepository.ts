import { saveRouteBreadcrumbToFirestore, subscribeRouteBreadcrumbs } from '../services/firebase';
import { RouteBreadcrumb } from '../types';

export const breadcrumbRepository = {
  save: (breadcrumb: RouteBreadcrumb) => saveRouteBreadcrumbToFirestore(breadcrumb),
  subscribe: (callback: (crumbs: RouteBreadcrumb[]) => void) => subscribeRouteBreadcrumbs(callback),
};
