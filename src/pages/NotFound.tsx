import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { BookX, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="content-card p-12 text-center max-w-md mx-4">
        <div className="content-card-icon w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookX className="w-10 h-10" />
        </div>
        <h1 className="mb-3 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">عذراً! الصفحة غير موجودة</p>
        <Button asChild className="btn-primary-glow">
          <Link to="/" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
