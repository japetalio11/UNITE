"use client";

import Sidebar from "@/components/sidebar";

interface DashboardLayoutProps {
    children: React.ReactNode;
}
    
export default function SysAdminDashboardLayout({
    children,
}: DashboardLayoutProps) {
    return (
        <div className="h-screen flex">
            {/* Sidebar */}
            <Sidebar
                role="sysadmin"
                userInfo={{
                    name: "John Doe",
                    email: "john@example.com",
                }}
            />
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>   
    );
}