import React from 'react';
import DashboardView from '../../../components/DashboardView';
import UploadView from '../../../components/UploadView';
import PendingReviewsView from '../../../components/PendingReviewsView';
import GalleryView from '../../../components/GalleryView';
import FollowUpsView from '../../../components/FollowUpsView';
import AdminPanelView from '../../../components/AdminPanelView';
import ProfileView from '../../../components/ProfileView';
import RouteTrackerView from '../../tracking/components/RouteTrackerView';
import AnalyticsDashboardView from '../../analytics/components/AnalyticsDashboardView';
import LeadEscalationView from '../../escalations/components/LeadEscalationView';
import OdometerTrackerView from '../../../components/OdometerTrackerView';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { useAppStore } from '../../../stores/useAppStore';
import { exportPhotosToExcel } from '../../../utils/exportUtils';
import { settingsRepository } from '../../../repositories/settingsRepository';
import { teamRepository } from '../../../repositories/teamRepository';
import { addLocalBreadcrumb } from '../../../utils/routeLogger';
import { Photo, SyncStatus, StaffLocation } from '../../../types';

export default function ViewRouter() {
  const currentUser = useAppStore(s => s.currentUser);
  const currentView = useAppStore(s => s.currentView);
  const viewParams = useAppStore(s => s.viewParams);
  const navigateTo = useAppStore(s => s.navigateTo);

  const photos = useAppStore(s => s.photos);
  const followUps = useAppStore(s => s.followUps);
  const recycleBin = useAppStore(s => s.recycleBin);
  const isOnline = useAppStore(s => s.isOnline);

  const leadSources = useAppStore(s => s.leadSources);
  const personTypes = useAppStore(s => s.personTypes);
  const constructionStages = useAppStore(s => s.constructionStages);

  const setLeadSources = useAppStore(s => s.setLeadSources);
  const setPersonTypes = useAppStore(s => s.setPersonTypes);
  const setConstructionStages = useAppStore(s => s.setConstructionStages);

  const storeAddPhoto = useAppStore(s => s.addPhoto);
  const updatePhoto = useAppStore(s => s.updatePhoto);
  const deletePhoto = useAppStore(s => s.deletePhoto);
  const restorePhoto = useAppStore(s => s.restorePhoto);
  const permanentlyDeletePhoto = useAppStore(s => s.permanentlyDeletePhoto);
  const emptyRecycleBin = useAppStore(s => s.emptyRecycleBin);

  const addFollowUp = useAppStore(s => s.addFollowUp);
  const toggleFollowUp = useAppStore(s => s.toggleFollowUp);
  const rescheduleFollowUp = useAppStore(s => s.rescheduleFollowUp);

  const handleLogout = useAppStore(s => s.handleLogout);
  const handleUpdateUser = useAppStore(s => s.handleUpdateUser);

  const teamMembers = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('fieldops_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'u1', name: 'Rajesh Kumar', email: 'admin@company.com', role: 'admin', phone: '+91 98765 43210', active: true },
      { id: 'u2', name: 'Amanpreet Singh', email: 'meera@maharajacrm.com', role: 'staff', phone: '+91 98765 43211', active: true }
    ];
  }, [currentUser]);

  const handleAddPhoto = (newPhoto: Photo) => {
    storeAddPhoto(newPhoto);

    if (currentUser) {
      const photoLoc: StaffLocation = {
        lat: newPhoto.site_lat !== undefined ? newPhoto.site_lat : (newPhoto.gps?.lat || 30.9010),
        lng: newPhoto.site_lng !== undefined ? newPhoto.site_lng : (newPhoto.gps?.lng || 75.8573),
        accuracy: 8,
        timestamp: newPhoto.captureDate || newPhoto.uploadDate || new Date().toISOString(),
        address: newPhoto.siteName || 'Punjab Region',
        plusCode: newPhoto.plusCode || 'Verified GPS',
        isLive: true,
        deviceInfo: newPhoto.deviceInfo || 'Android Mobile Phone'
      };

      addLocalBreadcrumb({
        lat: photoLoc.lat,
        lng: photoLoc.lng,
        accuracy: 8,
        timestamp: photoLoc.timestamp,
        plusCode: photoLoc.plusCode,
        deviceInfo: photoLoc.deviceInfo,
        userId: currentUser.id,
        userName: currentUser.name
      });

      const updatedUser = { ...currentUser, lastLocation: photoLoc };
      handleUpdateUser(updatedUser);
    }
  };

  const handleUpdateTeamMembers = (updatedMembers: any[]) => {
    localStorage.setItem('fieldops_team_members', JSON.stringify(updatedMembers));
    updatedMembers.forEach(m => teamRepository.save(m));
    if (currentUser) {
      const match = updatedMembers.find(m => m.id === currentUser.id || (m.email && m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()));
      if (match) {
        handleUpdateUser(match);
      }
    }
  };

  if (!currentUser) return null;

  return (
    <ErrorBoundary fallbackTitle={`${currentView.toUpperCase()} View Exception`}>
      {(() => {
        switch (currentView) {
          case 'dashboard':
            return (
              <DashboardView 
                user={currentUser} 
                photos={photos} 
                followUps={followUps} 
                onChangeView={(v, p) => navigateTo(v, p)}
                onToggleFollowUpStatus={(id) => toggleFollowUp(id)}
              />
            );

          case 'upload':
            return (
              <div className="p-4 md:p-0">
                <UploadView 
                  user={currentUser} 
                  isOnline={isOnline}
                  onUpload={(p) => {
                    const finalPhoto = { ...p, syncStatus: (isOnline ? 'synced' : 'pending') as SyncStatus };
                    handleAddPhoto(finalPhoto);
                    setTimeout(() => navigateTo('pending'), 1500);
                  }} 
                  onViewPending={() => navigateTo('pending')}
                />
              </div>
            );

          case 'pending':
            return (
              <div className="p-4 md:p-0">
                <PendingReviewsView 
                  user={currentUser} 
                  photos={photos} 
                  isOnline={isOnline}
                  leadSources={leadSources}
                  personTypes={personTypes}
                  constructionStages={constructionStages}
                  onUpdatePhoto={updatePhoto}
                  onDeletePhoto={(id) => deletePhoto(id, currentUser.name)}
                  onAddFollowUp={addFollowUp}
                  onBack={() => navigateTo('dashboard')}
                />
              </div>
            );

          case 'gallery':
            return (
              <div className="p-4 md:p-0">
                <GalleryView 
                  user={currentUser} 
                  photos={photos} 
                  initialDateFilter={viewParams.dateFilter}
                  onExport={() => exportPhotosToExcel(photos, 'FieldTrack_Gallery_Leads')}
                  onBack={() => navigateTo('dashboard')}
                />
              </div>
            );

          case 'followups':
            return (
              <div className="p-4 md:p-0">
                <FollowUpsView 
                  user={currentUser}
                  photos={photos}
                  followUps={followUps}
                  initialTab={viewParams.tab}
                  onToggleStatus={toggleFollowUp}
                  onReschedule={rescheduleFollowUp}
                  onBack={() => navigateTo('dashboard')}
                />
              </div>
            );

          case 'admin':
            return currentUser.role === 'admin' ? (
              <div className="p-4 md:p-0">
                <AdminPanelView 
                  photos={photos} 
                  followUps={followUps}
                  leadSources={leadSources}
                  onUpdateLeadSources={(sources) => {
                    setLeadSources(sources);
                    settingsRepository.save({ leadSources: sources });
                  }}
                  personTypes={personTypes}
                  onUpdatePersonTypes={(types) => {
                    setPersonTypes(types);
                    settingsRepository.save({ personTypes: types });
                  }}
                  constructionStages={constructionStages}
                  onUpdateConstructionStages={(stages) => {
                    setConstructionStages(stages);
                    settingsRepository.save({ constructionStages: stages });
                  }}
                  onUpdatePhoto={updatePhoto}
                  onDeletePhoto={(id) => deletePhoto(id, currentUser.name)}
                  recycleBin={recycleBin}
                  onRestoreFromRecycleBin={restorePhoto}
                  onPermanentlyDeleteFromRecycleBin={permanentlyDeletePhoto}
                  onEmptyRecycleBin={emptyRecycleBin}
                  onUpdateTeamMembers={handleUpdateTeamMembers}
                />
              </div>
            ) : null;

          case 'odometer':
            return (
              <div className="p-4 md:p-0">
                <OdometerTrackerView currentUser={currentUser} teamMembers={teamMembers} />
              </div>
            );

          case 'profile':
            return (
              <ProfileView 
                user={currentUser}
                onUpdateUser={handleUpdateUser}
                onLogout={handleLogout}
                onBack={() => navigateTo('dashboard')}
              />
            );

          case 'route_tracker':
            return (
              <div className="p-4 md:p-0">
                <RouteTrackerView currentUser={currentUser} teamMembers={teamMembers} />
              </div>
            );

          case 'analytics':
            return (
              <div className="p-4 md:p-0">
                <AnalyticsDashboardView photos={photos} followUps={followUps} teamMembers={teamMembers} />
              </div>
            );

          case 'escalations':
            return (
              <div className="p-4 md:p-0">
                <LeadEscalationView 
                  photos={photos} 
                  followUps={followUps} 
                  teamMembers={teamMembers}
                  onReassignFollowUp={(fuId, newUserId) => {
                    const match = followUps.find(f => f.id === fuId);
                    const photo = match ? photos.find(p => p.id === match.photoId) : null;
                    if (photo) updatePhoto({ ...photo, assignedTo: newUserId });
                  }}
                  onCompleteFollowUp={toggleFollowUp}
                />
              </div>
            );

          default:
            return null;
        }
      })()}
    </ErrorBoundary>
  );
}
