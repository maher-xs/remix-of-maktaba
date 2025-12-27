import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import PageGuard from "@/components/PageGuard";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { prefetchCommonRoutes } from "@/hooks/usePrefetch";
import { usePopularBooksPrefetch } from "@/hooks/usePopularBooksPrefetch";
import ScrollToTop from "@/components/ScrollToTop";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";
import AthkarProvider from "@/components/athkar/AthkarProvider";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Categories = lazy(() => import("./pages/Categories"));
const CategoryBooks = lazy(() => import("./pages/CategoryBooks"));
const BookDetails = lazy(() => import("./pages/BookDetails"));
const About = lazy(() => import("./pages/About"));
const Search = lazy(() => import("./pages/Search"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));

const MyLibrary = lazy(() => import("./pages/MyLibrary"));
const UploadBook = lazy(() => import("./pages/UploadBook"));
const EditBook = lazy(() => import("./pages/EditBook"));
const ReadBook = lazy(() => import("./pages/ReadBook"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SavedBooks = lazy(() => import("./pages/SavedBooks"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));

const ReadingLists = lazy(() => import("./pages/ReadingLists"));
const PublicReadingList = lazy(() => import("./pages/PublicReadingList"));
const ExploreReadingLists = lazy(() => import("./pages/ExploreReadingLists"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const Stats = lazy(() => import("./pages/Stats"));
const Donate = lazy(() => import("./pages/Donate"));
const Discussions = lazy(() => import("./pages/Discussions"));
const DiscussionDetails = lazy(() => import("./pages/DiscussionDetails"));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBooks = lazy(() => import("./pages/admin/AdminBooks"));
const AdminBookDetails = lazy(() => import("./pages/admin/AdminBookDetails"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminAppearance = lazy(() => import("./pages/admin/AdminAppearance"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AdminSecurityLogs = lazy(() => import("./pages/admin/AdminSecurityLogs"));
const AdminBlockedIPs = lazy(() => import("./pages/admin/AdminBlockedIPs"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminAds = lazy(() => import("./pages/admin/AdminAds"));
const AdminSecurityDashboard = lazy(() => import("./pages/admin/AdminSecurityDashboard"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminWarnings = lazy(() => import("./pages/admin/AdminWarnings"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminDiscussions = lazy(() => import("./pages/admin/AdminDiscussions"));
const AdminBackups = lazy(() => import("./pages/admin/AdminBackups"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Wrapper component that uses hooks
const AppContent = () => {
  // Prefetch popular books data for offline use
  usePopularBooksPrefetch();
  
  return (
    <>
      <GoogleAnalytics />
      <AthkarProvider />
    </>
  );
};

const App = () => {
  // Prefetch common routes on app load
  useEffect(() => {
    prefetchCommonRoutes();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppContent />
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <OfflineIndicator />
        <BrowserRouter>
          <ScrollToTop />
          <PageGuard>
            <Suspense fallback={<LoadingSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/:slug" element={<CategoryBooks />} />
                <Route path="/book/:id" element={<BookDetails />} />
                <Route path="/book/:id/edit" element={<EditBook />} />
                <Route path="/book/:id/read" element={<ReadBook />} />
                <Route path="/about" element={<About />} />
                <Route path="/search" element={<Search />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/settings" element={<Profile />} />
                
                <Route path="/my-library" element={<MyLibrary />} />
                <Route path="/upload" element={<UploadBook />} />
                <Route path="/user/:username" element={<PublicProfile />} />
                <Route path="/saved-books" element={<SavedBooks />} />
                <Route path="/install" element={<InstallApp />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/discussions" element={<Discussions />} />
                <Route path="/discussions/:id" element={<DiscussionDetails />} />
                {/* /profile redirected to /settings */}
                <Route path="/reading-lists" element={<ReadingLists />} />
                <Route path="/reading-list/:listId" element={<PublicReadingList />} />
                <Route path="/explore-lists" element={<ExploreReadingLists />} />
                <Route path="/sitemap" element={<Sitemap />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/donate" element={<Donate />} />
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/books" element={<AdminBooks />} />
                <Route path="/admin/books/:id" element={<AdminBookDetails />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/messages" element={<AdminMessages />} />
                <Route path="/admin/reviews" element={<AdminReviews />} />
                <Route path="/admin/roles" element={<AdminRoles />} />
                <Route path="/admin/pages" element={<AdminPages />} />
                <Route path="/admin/appearance" element={<AdminAppearance />} />
                <Route path="/admin/security" element={<AdminSecurityLogs />} />
                <Route path="/admin/blocked-ips" element={<AdminBlockedIPs />} />
                <Route path="/admin/security-dashboard" element={<AdminSecurityDashboard />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/activity" element={<AdminActivityLog />} />
                <Route path="/admin/ads" element={<AdminAds />} />
                <Route path="/admin/warnings" element={<AdminWarnings />} />
                <Route path="/admin/team" element={<AdminTeam />} />
                <Route path="/admin/discussions" element={<AdminDiscussions />} />
                <Route path="/admin/backups" element={<AdminBackups />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PageGuard>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
