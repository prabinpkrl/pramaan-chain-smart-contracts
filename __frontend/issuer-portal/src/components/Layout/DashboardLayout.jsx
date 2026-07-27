import Header from "./Header";
import Sidebar from "./Sidebar";

function DashboardLayout({ role, children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header role={role} />

      <div className="dashboard-shell">
        <Sidebar role={role} />

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
