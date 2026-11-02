'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, ChevronRight, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/audit-log': 'Audit Logs',
  '/rent': 'Rent Dashboard',
  '/rent/rooms': 'Rooms',
  '/rent/rooms/new': 'New Room',
  '/rent/reports': 'Rent Reports',
  '/rent/approvals': 'HOD Approvals',
  '/rems': 'Reimbursement Hub',
  '/rems/my-requests': 'My Requests',
  '/rems/approvals': 'Manager Approvals',
  '/rems/finance': 'Finance Queue',
  '/rems/reports': 'ReMS Reports',
  '/rems/advance/new': 'New Advance Request',
  '/rems/reimbursement/new': 'New Reimbursement',
  '/profile/change-password': 'Change Password',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Handle dynamic routes like /rent/rooms/[id]
  if (pathname.startsWith('/rent/rooms/') && pathname.split('/').length === 4) return 'Room Details';
  if (pathname.startsWith('/rems/reimbursement/') && pathname.includes('/status')) return 'Request Status';
  return 'Dashboard';
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  const labels: Record<string, string> = {
    admin: 'Admin', rent: 'Rent', rems: 'ReMS', rooms: 'Rooms',
    reports: 'Reports', approvals: 'Approvals', dashboard: 'Dashboard',
    users: 'Users', 'audit-log': 'Audit Logs', finance: 'Finance',
    'my-requests': 'My Requests', advance: 'Advance', reimbursement: 'Reimbursement',
    new: 'New', profile: 'Profile', 'change-password': 'Change Password',
  };

  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    crumbs.push({ label: labels[part] || part, href: path });
  }

  return crumbs;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notifications]')) setShowDropdown(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch<any[]>('/api/notifications');
      if (res.success && res.data) setNotifications(res.data);
    } catch (err) { /* silent */ }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) { /* silent */ }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { /* silent */ }
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;
  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0 print:hidden">
      {/* Left: Breadcrumbs + Page Title */}
      <div className="flex flex-col justify-center min-w-0">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
              {i < breadcrumbs.length - 1 ? (
                <Link href={crumb.href} className="hover:text-[#F37338] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-500 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
        {/* Page Title */}
        <h1 className="text-lg font-semibold text-[#141413] tracking-tight leading-tight truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Greeting (desktop only) */}
        <div className="hidden lg:block text-right mr-2">
          <p className="text-xs text-gray-400">{getGreeting()},</p>
          <p className="text-sm font-medium text-gray-700">{user.name.split(' ')[0]}</p>
        </div>

        {/* Notifications */}
        <div className="relative" data-notifications>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
            className="relative p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl transition-all duration-200 hover:text-gray-700"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 gradient-orange rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-pulse-glow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-[#F37338] hover:underline font-medium">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      className={`px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer ${!n.read ? 'bg-orange-50/30' : ''}`}
                      onClick={() => !n.read && markAsRead(n.id)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 shrink-0">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${!n.read ? 'bg-[#F37338]' : 'bg-gray-200'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                            {n.message}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <Link href="/profile/change-password" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-full gradient-orange text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </Link>
      </div>
    </header>
  );
}
