import { Photo } from '../types';
import { formatSafePhotoDateTime } from '../services/dateUtils';
import { getDeviceModelInfo } from './locationUtils';

/**
 * Escapes a cell value for CSV output to guarantee that quotes, commas, 
 * linebreaks, and special characters don't corrupt columns or shift headers.
 */
export const escapeCsvField = (val: any): string => {
  if (val === undefined || val === null) return '""';
  let str = String(val).replace(/[\r\n]+/g, ' ').trim();
  str = str.replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Formats numbers / phone numbers cleanly so Excel treats them as literal text strings,
 * preventing automatic conversion to scientific notation (e.g., 7.84E+09).
 */
export const formatPhoneForExcel = (phone: string | undefined | null): string => {
  if (!phone || !phone.trim()) return '""';
  const clean = phone.trim().replace(/[\r\n]+/g, ' ');
  // Format with explicit leading quote or formatted string so Excel keeps verbatim digits
  if (/^\+?\d{7,15}$/.test(clean.replace(/[\s-]/g, ''))) {
    const formatted = clean.startsWith('+') ? clean : `+91 ${clean}`;
    return escapeCsvField(formatted);
  }
  return escapeCsvField(clean);
};

/**
 * Exports site visit photo records to an Excel-ready CSV spreadsheet
 * with exact column alignment and comprehensive lead metadata.
 */
export const exportPhotosToExcel = (
  photos: Photo[],
  filenamePrefix = 'FieldTrack_SiteVisits',
  _auditMeta?: { actorUserId?: string; actorName?: string; actorRole?: string; selectedCount?: number }
) => {
  if (!photos || photos.length === 0) {
    alert("No visit records available to export. Please adjust your filters or upload a site photo.");
    return;
  }

  const headers = [
    "Site Name / Address",
    "Primary Contact Name",
    "Primary Contact Phone",
    "Primary Designation",
    "Primary Email / Alt Phone",
    "Firm Name",
    "Secondary Contacts",
    "Staff Member / Operator",
    "Status",
    "Lead Source",
    "Referred By Professional",
    "Construction Stage",
    "Material Interests",
    "Other Material Notes",
    "Estimated Requirement / Qty",
    "Plus Code",
    "GPS Coordinates",
    "Latitude",
    "Longitude",
    "Location Source",
    "Visit Date & Time",
    "Device & Platform Info",
    "Follow-Up Priority",
    "Field Observations & Notes",
    "Photo Reference / URL"
  ];

  const rows = photos.map(p => {
    const primary = p.peopleMet && p.peopleMet[0] ? p.peopleMet[0] : null;
    
    const secondary = p.peopleMet && p.peopleMet.length > 1 
      ? p.peopleMet.slice(1).map(sec => {
          const parts = [sec.name || 'Contact'];
          if (sec.phone) parts.push(`Phone: ${sec.phone}`);
          if (sec.designation) parts.push(`Role: ${sec.designation}`);
          if (sec.firmName) parts.push(`Firm: ${sec.firmName}`);
          return parts.join(' - ');
        }).join(" | ")
      : "";

    const materials = (p.materialInterests || []).join("; ");
    
    const primaryEmailAlt = primary 
      ? [primary.email, primary.alternatePhone ? `Alt: ${primary.alternatePhone}` : ''].filter(Boolean).join(' | ') 
      : '';

    const referredByStr = p.referredBy 
      ? `${p.referredBy.name || ''} (${p.referredBy.type || 'Professional'}${p.referredBy.firmName ? ' - ' + p.referredBy.firmName : ''})`
      : '';

    const leadSourceStr = p.leadSource === 'Other' && p.customLeadSource 
      ? p.customLeadSource 
      : (p.leadSource || 'Field Visit');

    const statusStr = p.status === 'in-progress' ? 'In Progress' 
      : p.status === 'new' ? 'New Lead'
      : p.status === 'quoted' ? 'Quoted'
      : p.status === 'won' ? 'Won'
      : p.status === 'lost' ? 'Lost'
      : p.status === 'on-hold' ? 'On Hold'
      : p.hasDraft ? 'Draft' 
      : 'In Progress';

    const staffName = p.staffMember || p.uploaderName || 'Amanpreet';
    
    let devInfo = p.deviceInfo || '';
    if (!devInfo || devInfo.includes('(K)')) {
      devInfo = getDeviceModelInfo();
    }
    const locVerification = p.locationSource === 'exif' ? 'EXIF GPS Metadata' : 'Verified Device GPS';

    const latVal = p.site_lat !== undefined ? p.site_lat : (p.gps?.lat ?? 30.901000);
    const lngVal = p.site_lng !== undefined ? p.site_lng : (p.gps?.lng ?? 75.857300);
    const formattedDate = formatSafePhotoDateTime(p.captureDate, p.uploadDate);

    // Field Observations & Notes
    const fieldNotes = p.notes || (p as any).keyNotes || (p as any).fieldNotes || (p as any).fieldObservations || (p as any).remarks || '';

    // Handle Photo URL safely: prevent giant base64 data URIs from breaking Excel cells
    let photoUrlStr = p.url || '';
    if (photoUrlStr.startsWith('data:image') || photoUrlStr.length > 300) {
      photoUrlStr = '[Embedded Device Photo]';
    }

    return [
      escapeCsvField(p.siteName || p.fileName || 'Site Visit'),
      escapeCsvField(primary?.name || ''),
      formatPhoneForExcel(primary?.phone),
      escapeCsvField(primary?.designation || ''),
      escapeCsvField(primaryEmailAlt),
      escapeCsvField(primary?.firmName || ''),
      escapeCsvField(secondary),
      escapeCsvField(staffName),
      escapeCsvField(statusStr),
      escapeCsvField(leadSourceStr),
      escapeCsvField(referredByStr),
      escapeCsvField(p.constructionStage || ''),
      escapeCsvField(materials),
      escapeCsvField(p.othersMaterialNote || ''),
      escapeCsvField(p.estimatedQuantity || ''),
      escapeCsvField(p.plusCode || ''),
      escapeCsvField(`${latVal.toFixed(6)}, ${lngVal.toFixed(6)}`),
      latVal.toFixed(6),
      lngVal.toFixed(6),
      escapeCsvField(locVerification),
      escapeCsvField(formattedDate),
      escapeCsvField(`${devInfo} (${locVerification})`),
      escapeCsvField(p.priority || 'Medium'),
      escapeCsvField(fieldNotes),
      escapeCsvField(photoUrlStr)
    ].join(",");
  });

  const csvContent = "\uFEFF" + headers.map(h => escapeCsvField(h)).join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.download = `${filenamePrefix}_${dateStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
