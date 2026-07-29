import { LeadEscalationItem, FollowUp, Photo, User } from '../types';

/**
 * Scans all follow-ups and identifies SLA violations and overdue leads
 */
export function calculateLeadEscalations(
  followUps: FollowUp[],
  photos: Photo[],
  teamMembers: User[]
): LeadEscalationItem[] {
  const nowMs = Date.now();
  const escalations: LeadEscalationItem[] = [];

  followUps.forEach((fu) => {
    if (fu.status === 'completed') return;

    const dueMs = new Date(fu.dueDate).getTime();
    if (isNaN(dueMs)) return;

    if (nowMs > dueMs) {
      const diffHours = Math.floor((nowMs - dueMs) / (1000 * 60 * 60));
      if (diffHours < 1) return;

      const photo = photos.find(p => p.id === fu.photoId);
      const staff = teamMembers.find(m => m.id === (photo?.assignedTo || fu.userId));

      let urgencyLevel: 'warning' | 'critical' | 'severe' = 'warning';
      if (diffHours >= 48) {
        urgencyLevel = 'severe';
      } else if (diffHours >= 24) {
        urgencyLevel = 'critical';
      }

      escalations.push({
        id: `esc_${fu.id}`,
        photoId: fu.photoId,
        clientName: photo?.clientName || 'Unassigned Client',
        siteName: photo?.siteName || 'Field Location',
        assignedStaffId: staff?.id || fu.userId || 'u1',
        assignedStaffName: staff?.name || fu.userName || 'Field Staff',
        followUpDueDate: fu.dueDate,
        hoursOverdue: diffHours,
        urgencyLevel,
        status: 'pending_action',
        escalatedAt: new Date().toISOString()
      });
    }
  });

  return escalations.sort((a, b) => b.hoursOverdue - a.hoursOverdue);
}
