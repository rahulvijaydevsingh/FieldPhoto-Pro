import { RouteBreadcrumb } from '../types';
import { subscribeRouteBreadcrumbs } from '../services/firebase';
import { addLocalBreadcrumb } from '../utils/routeLogger';

export const breadcrumbRepository = {
  async save(crumbData: Partial<RouteBreadcrumb>): Promise<void> {
    addLocalBreadcrumb({
      lat: crumbData.lat || 30.9010,
      lng: crumbData.lng || 75.8573,
      accuracy: crumbData.accuracy || 8,
      timestamp: crumbData.timestamp || new Date().toISOString(),
      plusCode: crumbData.plusCode || 'Verified GPS',
      deviceInfo: crumbData.deviceInfo || 'Android Device',
      userId: crumbData.userId || 'u1',
      userName: crumbData.userName || 'Field Staff'
    });
  }
};

export function subscribeUserBreadcrumbs(
  userId: string,
  onUpdate: (breadcrumbs: RouteBreadcrumb[]) => void
) {
  return subscribeRouteBreadcrumbs((allCrumbs) => {
    if (!Array.isArray(allCrumbs)) {
      onUpdate([]);
      return;
    }
    const filtered = allCrumbs.filter(c => !userId || userId === 'all' || c.userId === userId);
    onUpdate(filtered);
  });
}

export function filterBreadcrumbsByDate(breadcrumbs: RouteBreadcrumb[], dateStr: string): RouteBreadcrumb[] {
  if (!dateStr) return breadcrumbs;
  return breadcrumbs.filter((b) => {
    const bDate = new Date(b.timestamp).toISOString().split('T')[0];
    return bDate === dateStr;
  });
}
