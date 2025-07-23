'use client';

import React from 'react';
import ActiveTimer from '@/components/dashboard/ActiveTimer';
import EnhancedTimeEntriesList from '@/components/time-entries/EnhancedTimeEntriesList';
import AdminHeader from '@/components/navigation/AdminHeader';


export default function ReportsClient() {
  return (
    <>
      <AdminHeader />
      
      <div className="container mx-auto px-2 md:px-4 lg:px-6 py-8">
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Time tracking reports and detailed activity logs
          </p>
        </div>

        {/* Active Timer - Mobile/Tablet only */}
        <div className="block lg:hidden mb-6">
          <ActiveTimer mode="standalone" />
        </div>

        {/* Main Content */}
        <div>
          <EnhancedTimeEntriesList />
        </div>
      </div>
    </>
  );
}