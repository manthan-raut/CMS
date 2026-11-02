'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { useAuth } from '@/modules/auth/AuthContext';
import { apiListRooms, apiApproveRoom, apiRejectRoom, Room } from '@/lib/rooms-api';

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_CLOSURE: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-[#141413]/10 text-[#696969]',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: 'Pending Approval', ACTIVE: 'Active',
  PENDING_CLOSURE: 'Pending Closure', CLOSED: 'Closed',
};

export default function RoomsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ id: string } | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');

  const canApprove = user?.role === 'HOD' || user?.role === 'HR_ADMIN' || user?.role === 'FINANCE_MANAGER';
  const canCreate = user?.role === 'PROJECT_MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'FINANCE_MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiListRooms({ status: filterStatus || undefined });
    if (res.success && res.data) setRooms(res.data);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    await apiApproveRoom(id);
    load();
  }

  async function handleReject() {
    if (!rejectDialog) return;
    await apiRejectRoom(rejectDialog.id, rejectRemark);
    setRejectDialog(null); setRejectRemark('');
    load();
  }

  return (
    <>
      <div className="p-6 md:p-8 animate-fade-in-up">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1 mb-1">
                <span className="text-[#F37338]">•</span> RMS-Rent
              </p>
              <h1 className="text-3xl font-medium text-[#141413] tracking-tight">Rooms</h1>
              <p className="text-sm text-[#696969] mt-1">{rooms.length} room{rooms.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                id="filter-status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-[16px] border border-[#141413]/20 bg-white text-[#141413] text-sm focus:outline-none focus:border-[#141413] transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_CLOSURE">Pending Closure</option>
                <option value="CLOSED">Closed</option>
              </select>
              {canCreate && (
                <Link
                  href="/rent/rooms/new"
                  id="new-room-btn"
                  className="px-5 py-2.5 rounded-[16px] bg-[#141413] text-[#F3F0EE] text-sm font-medium hover:bg-[#262627] transition-colors whitespace-nowrap"
                >
                  + New Room
                </Link>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#141413]" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-[24px] p-16 text-center">
              <p className="text-[#696969] text-sm">No rooms found for the selected filter.</p>
              {canCreate && (
                <Link href="/rent/rooms/new" className="inline-block mt-4 px-5 py-2.5 rounded-[16px] bg-[#141413] text-[#F3F0EE] text-sm font-medium">
                  Submit Your First Room
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#141413]/10">
                      {['Room No.', 'Project', 'City', 'Owner', 'Monthly Rent', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-6 py-4 text-xs font-bold tracking-[0.04em] uppercase text-[#696969]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(room => (
                      <tr key={room.id} className="border-b border-[#141413]/5 hover:bg-[#F3F0EE]/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-[#141413]">
                          {room.roomNumber || <span className="text-[#696969] italic">Pending</span>}
                        </td>
                        <td className="px-6 py-4 text-[#141413]">{room.projectName}</td>
                        <td className="px-6 py-4 text-[#696969]">
                          <div className="flex items-center gap-1.5">
                            <span>{room.city}</span>
                            <a
                              href={room.googleMapLocation || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${room.address}, ${room.city}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#F37338] hover:text-[#c45322] transition-colors"
                              title="View Address on Google Maps"
                            >
                              <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#696969]">{room.owner?.name}</td>
                        <td className="px-6 py-4 font-medium text-[#141413]">₹{Number(room.monthlyRent).toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[room.status]}`}>
                            {STATUS_LABELS[room.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              id={`view-room-${room.id}`}
                              onClick={() => router.push(`/rent/rooms/${room.id}`)}
                              className="px-3 py-1.5 rounded-[10px] text-xs font-medium border border-[#141413]/20 hover:border-[#141413] hover:text-[#141413] transition-colors text-[#696969]"
                            >
                              View
                            </button>
                            {canApprove && room.status === 'PENDING_APPROVAL' && (
                              <>
                                <button
                                  id={`approve-room-${room.id}`}
                                  onClick={() => handleApprove(room.id)}
                                  className="px-3 py-1.5 rounded-[10px] text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  id={`reject-room-${room.id}`}
                                  onClick={() => { setRejectDialog({ id: room.id }); setRejectRemark(''); }}
                                  className="px-3 py-1.5 rounded-[10px] text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-medium text-[#141413] mb-2">Reject Room</h3>
            <p className="text-sm text-[#696969] mb-5">Please provide a reason for rejection.</p>
            <textarea
              id="reject-remark"
              value={rejectRemark}
              onChange={e => setRejectRemark(e.target.value)}
              rows={4}
              placeholder="Reason for rejection..."
              className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-[#141413] placeholder:text-[#696969] focus:outline-none focus:border-[#141413] text-sm resize-none"
            />
            <div className="flex gap-3 mt-5">
              <button
                id="reject-cancel"
                onClick={() => setRejectDialog(null)}
                className="flex-1 py-3 rounded-[16px] border border-[#141413] text-[#141413] text-sm font-medium hover:bg-[#141413]/5 transition-colors"
              >
                Cancel
              </button>
              <button
                id="reject-confirm"
                onClick={handleReject}
                className="flex-1 py-3 rounded-[16px] bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
