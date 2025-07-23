'use client';

import dynamic from 'next/dynamic';

const ReportsClient = dynamic(() => import('@/components/reports/ReportsClient'), { ssr: false });

export default function Reports() {
  return <ReportsClient />;
}