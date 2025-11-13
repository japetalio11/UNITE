import Sidebar from "@/components/sidebar";
import { cookies } from "next/headers";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default async function SysAdminDashboardLayout({ children }: DashboardLayoutProps) {
    // Attempt to read a server-set cookie named 'unite_user' (if your
    // authentication sets this cookie). This lets the Sidebar receive
    // server-derived userInfo during SSR so system-admins see admin links
    // without waiting for client-side localStorage.
    let userInfoProp: any = null;
    try {
        const cookieStore = await cookies();
        const c = cookieStore.get('unite_user')?.value || null;
        const parsed = c ? JSON.parse(c) : null;
        if (parsed) {
            userInfoProp = {
                raw: parsed,
                role: parsed.role || parsed.StaffType || parsed.staff_type || parsed.staffType || null,
                isAdmin: !!parsed.isAdmin,
                displayName: parsed.displayName || parsed.First_Name || parsed.name || null,
                email: parsed.email || parsed.Email || null,
            };
            // developer-only logging removed
        }
    } catch (e) {
        // ignore cookie parse errors
    }

    // Compute server-side visibility flags for the sidebar. These are
    // preferred by the client Sidebar to avoid hydration mismatches.
    const roleLower = String(userInfoProp?.role || '').toLowerCase();
    const serverIsSystemAdmin = Boolean(userInfoProp?.isAdmin || (roleLower.includes('sys') && roleLower.includes('admin')));
    const staffType = userInfoProp?.raw?.StaffType || userInfoProp?.raw?.staff_type || userInfoProp?.raw?.staffType || null;
    const serverIsCoordinator = Boolean((staffType && String(staffType).toLowerCase() === 'coordinator') || roleLower.includes('coordinator'));

    const initialShowCoordinator = serverIsSystemAdmin;
    const initialShowStakeholder = serverIsSystemAdmin || serverIsCoordinator;

    return (
        <div className="h-screen flex">
            <Sidebar
                role={userInfoProp?.role}
                userInfo={userInfoProp}
                initialShowCoordinator={initialShowCoordinator}
                initialShowStakeholder={initialShowStakeholder}
            />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}