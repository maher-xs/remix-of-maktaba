import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      console.log('SW registered:', registration.scope);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Every hour
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, refresh will use new version
              console.log('New content available, refresh to update');
            }
          });
        }
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('Back online - syncing data...');
    // Trigger sync event
    if ('sync' in window && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration: any) => {
        if (registration.sync) {
          registration.sync.register('sync-data');
        }
      });
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('Went offline - using cached data');
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
