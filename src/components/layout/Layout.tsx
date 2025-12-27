import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import PageTransition from '@/components/ui/page-transition';
import InstallPrompt from '@/components/pwa/InstallPrompt';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
};

export default Layout;
