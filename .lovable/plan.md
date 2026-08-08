# FieldPhoto-Pro Full Cleanup & Workflow Stabilization Plan

## Goal
Remove placeholder/demo behavior from active workflows and make three critical flows production-correct:
1) **Pending Reviews = site leads only**
2) **Odometer = real odometer records only (no seeded placeholders)**
3) **Live Route Tracking = selected staff’s pings only, with correct identity attribution**

## What I verified in the current code
- **Odometer placeholders are still auto-seeded** in `repositories/odometerRepository.ts` when local storage is empty (sample records with hardcoded users/photos).
- **Pending Reviews currently filters by `status === 'new'` only**, with no `photoType` guard, so non-lead photos can leak in if status matches.
- **Route tracker user mismatch can occur** because:
  - fallback/default identity and seeded users still exist in multiple modules,
  - filtering and normalization rely on mixed fields (`userId`, `userName`, `uploaderName`, defaults),
  - some UI areas still carry hardcoded placeholder fallbacks for names/images.
- **Admin staff tracking tab is rendered with a hardcoded admin user** (`DEMO_ADMIN`) in `AdminPanelView`, which can desync identity context from the logged-in user.

## Implementation plan

### 1) Enforce strict photo-domain isolation (Lead vs Odometer vs Attendance)
- Add a shared helper (or equivalent inline-safe guard) to classify photos by `photoType` with backward compatibility for old rows.
- Apply this consistently to:
  - `PendingReviewsView` (lead-only list)
  - `DashboardView` pending counters/recent uploads (lead-only)
  - `VisitsExplorer` (lead-only records)
  - `GalleryView` (already partially guarded; normalize and harden)
- Ensure any upload/review save path sets `photoType: 'lead'` deterministically.

### 2) Remove odometer placeholder seeding and hardcoded defaults
- Refactor `getLocalOdometerReadings()` to return `[]` when empty instead of injecting sample records.
- Remove hardcoded fallback vehicle number defaults that imply demo data; use empty/default prompt state per user instead.
- Keep all existing create/edit/delete odometer functionality intact.

### 3) Route tracking identity correctness and selected-staff fidelity
- Normalize route breadcrumb identity matching in one place (prefer `userId`, then robust name fallback only when needed).
- Ensure selected staff filter in route tracker is applied identically for:
  - map marker set,
  - timeline list,
  - headline/quick stats.
- Remove placeholder identity fallbacks that can silently map to wrong users.
- Validate that pings shown for selected staff cannot include another staff member unless explicitly in "all" mode.

### 4) Remove remaining placeholder content from active operational surfaces
- Audit and replace remaining hardcoded placeholders in impacted workflows:
  - fallback names like “Amanpreet”/generic staff labels where real user context is required,
  - demo imagery fallbacks where they appear as operational data instead of empty-state UI.
- Preserve intentional UX empty states, but ensure they are neutral and not fake operational records.

### 5) Data migration/cleanup strategy for existing live data
- Add a safe cleanup pass that affects only identified placeholder/demo records and leaves legitimate historical records untouched.
- Use deterministic markers (hardcoded sample IDs/patterns and known seeded structures) rather than broad deletes.
- Keep this migration idempotent so it can run safely more than once.

### 6) Workflow validation pass (end-to-end)
- Validate core user journeys after fixes:
  - upload lead photo → appears in pending reviews only,
  - odometer entry → appears only in odometer logs,
  - selecting a staff member in route tracker → timeline/map/stats align to same person.
- Confirm no regressions in admin edits, review submission, and export paths.

## Deliverables
- Updated production-safe behavior in:
  - pending reviews,
  - odometer logging/listing,
  - route tracking filters/identity mapping,
  - related dashboard/admin surfaces touched by these flows.
- Removal of active placeholder operational data behavior.
- A brief change log of what was cleaned and why.

## Technical details
- Primary files in scope:
  - `components/PendingReviewsView.tsx`
  - `components/OdometerTrackerView.tsx`
  - `components/OdometerEntryModal.tsx`
  - `repositories/odometerRepository.ts`
  - `features/tracking/components/RouteTrackerView.tsx`
  - `features/tracking/components/BreadcrumbTimeline.tsx`
  - `features/tracking/components/LiveRouteMap.tsx`
  - `utils/routeLogger.ts`
  - `components/DashboardView.tsx`
  - `features/admin/components/VisitsExplorer.tsx`
  - `features/admin/components/AdminPanelView.tsx`
  - `services/mockData.ts` (only where needed to avoid operational leakage)
- Approach:
  - minimal-risk targeted edits,
  - no feature removal beyond placeholder/demo behavior,
  - preserve existing telemetry batching and sync architecture.