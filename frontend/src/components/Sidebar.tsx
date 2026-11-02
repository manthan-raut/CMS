'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Home, FileText, ClipboardCheck, LayoutDashboard, Settings,
  Users, ChevronDown, LogOut, Shield, Building2, Receipt, Calendar, Clock
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: string[];
}

interface NavSection {
  title: string;
  icon: any;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    admin: true, rent: true, rems: true, 'employee operations': true,
  });

  if (!user) return null;

  const sections: NavSection[] = [
    {
      title: 'Overview',
      icon: LayoutDashboard,
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
        { label: 'Tasks', href: '/tasks', icon: ClipboardCheck, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
      ],
    },
    {
      title: 'Administration',
      icon: Shield,
      items: [
        { label: 'User Management', href: '/admin/users', icon: Users, roles: ['HR_ADMIN', 'FINANCE_MANAGER'] },
        { label: 'Audit Logs', href: '/admin/audit-log', icon: FileText, roles: ['HR_ADMIN', 'FINANCE_MANAGER'] },
      ],
    },
    {
      title: 'Rent Management',
      icon: Building2,
      items: [
        { label: 'Rent Dashboard', href: '/rent', icon: Home, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD'] },
        { label: 'All Rooms', href: '/rent/rooms', icon: Building2, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD'] },
        { label: 'Rent Reports', href: '/rent/reports', icon: FileText, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD'] },
        { label: 'HOD Approvals', href: '/rent/approvals', icon: ClipboardCheck, roles: ['HOD'] },
      ],
    },
    {
      title: 'Reimbursement',
      icon: Receipt,
      items: [
        { label: 'ReMS Home', href: '/rems', icon: Receipt, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
        { label: 'My Requests', href: '/rems/my-requests', icon: FileText, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
        { label: 'Manager Approvals', href: '/rems/approvals', icon: ClipboardCheck, roles: ['HOD', 'REPORTING_MANAGER'] },
        { label: 'Finance Queue', href: '/rems/finance', icon: Settings, roles: ['FINANCE_MANAGER'] },
        { label: 'ReMS Reports', href: '/rems/reports', icon: FileText, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'HOD', 'REPORTING_MANAGER'] },
      ],
    },
    {
      title: 'Employee Operations',
      icon: Users,
      items: [
        { label: 'Daily Work Entry', href: '/employee/calendar', icon: Calendar, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
        { label: 'Attendance & Leaves', href: '/employee/attendance', icon: Clock, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
        { label: 'Submit Claims', href: '/rems/reimbursement/new', icon: Receipt, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
        { label: 'My Claims', href: '/rems/my-requests', icon: FileText, roles: ['HR_ADMIN', 'FINANCE_MANAGER', 'PROJECT_MANAGER', 'HOD', 'REPORTING_MANAGER', 'EMPLOYEE'] },
      ],
    },
  ];

  const filteredSections = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(user.role)),
    }))
    .filter(section => section.items.length > 0);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title.toLowerCase()]: !prev[title.toLowerCase()] }));
  };

  return (
    <aside className="w-64 gradient-dark flex flex-col h-screen sticky top-0 shrink-0 print:hidden">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center shadow-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">PMGIS</h2>
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-medium">Enterprise Suite</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {filteredSections.map((section) => {
          const sectionKey = section.title.toLowerCase();
          const isExpanded = expandedSections[sectionKey] !== false;
          const hasActiveItem = section.items.some(item =>
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          );

          return (
            <div key={section.title} className="mb-1">
              {/* Section Header */}
              {section.items.length > 1 && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] rounded-lg transition-colors ${
                    hasActiveItem ? 'text-white/80' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <span>{section.title}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                </button>
              )}

              {/* Section Items */}
              {(isExpanded || section.items.length === 1) && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                          active
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-orange" />
                        )}
                        <item.icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#F37338]' : 'text-white/40 group-hover:text-white/60'}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile + Logout */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/profile/change-password"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-full gradient-orange text-white flex items-center justify-center font-bold text-sm shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-[11px] text-white/40 truncate">{user.role.replace(/_/g, ' ')}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full mt-1.5 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
