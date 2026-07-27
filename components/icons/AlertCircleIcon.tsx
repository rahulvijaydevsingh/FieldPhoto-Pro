import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function AlertCircleIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <AlertCircle size={size} className={className} />;
}
