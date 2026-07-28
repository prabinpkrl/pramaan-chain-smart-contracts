import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

function DashboardLayout({ children }) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Sidebar
        mobileOpen={mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
      />
      <div className="min-h-screen lg:pl-68">
        <Header onOpenNavigation={() => setMobileNavigationOpen(true)} />
        <main className="mx-auto w-full max-w-[1560px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
