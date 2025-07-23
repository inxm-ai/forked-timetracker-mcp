'use client';

import React from 'react';
import ActiveTimer from '@/components/dashboard/ActiveTimer';
import TrendCards from '@/components/dashboard/TrendCards';
import AdminHeader from '@/components/navigation/AdminHeader';
import EnhancedTimeEntriesList from '@/components/time-entries/EnhancedTimeEntriesList';

export default function Dashboard() {

  return (
    <>
      <AdminHeader />
      
      <div className="container mx-auto px-6 py-8 space-y-8">
        
        {/* Trends */}
        <TrendCards />

        {/* Active Timer - Mobile/Tablet only */}
        <div className="block lg:hidden">
          <ActiveTimer />
        </div>

        {/* Recent Time Entries */}
        <EnhancedTimeEntriesList mode="dashboard" maxEntries={5} />
      </div>
    </>
  );
}