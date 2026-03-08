'use client';

import dynamic from 'next/dynamic';

// Import the App dynamically with SSR disabled to prevent 
// hydration errors from React Router DOM's BrowserRouter using window.
const ClientApp = dynamic(() => import('@/App'), { ssr: false });

export default function CatchAllRoutes() {
  return <ClientApp />;
}
