import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <ProtectedAdminRoute>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-muted/30">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-30 h-14 border-b flex items-center gap-3 px-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
              <SidebarTrigger className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-base md:text-lg truncate">Experium Admin</span>
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedAdminRoute>
  );
};
