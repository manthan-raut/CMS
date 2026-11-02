'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { useAuth } from '@/modules/auth/AuthContext';
import { apiGetRentReport, apiApproveRoom, apiRejectRoom, apiApproveClosure, apiRejectClosure } from '@/lib/rooms-api';
import Link from 'next/link';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rooms' | 'closures'>('rooms');
  
  const [pendingRooms, setPendingRooms] = useState<any[]>([]);
  const [pendingClosures, setPendingClosures] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'approve_room' | 'reject_room' | 'approve_closure' | 'reject_closure'>('approve_room');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClosureId, setSelectedClosureId] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await apiGetRentReport('pending-hod-approval');
    if (res.success && res.data) {
      setPendingRooms((res.data as any).pendingRooms || []);
      setPendingClosures((res.data as any).pendingClosures || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === 'HOD') loadData();
    else setLoading(false);
  }, [user, loadData]);

  if (user && user.role !== 'HOD') {
    return (
      <div className="p-16 text-center">
        <p className="text-[#141413]">Access denied. HOD role required.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="p-16 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#141413]" />
    </div>
  );

  function openModal(type: typeof modalType, id: string, closureId?: string) {
    setModalType(type);
    setSelectedId(id);
    setSelectedClosureId(closureId || null);
    setRemark('');
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!selectedId) return;
    setActionLoading(true);
    
    let res;
    if (modalType === 'approve_room') res = await apiApproveRoom(selectedId);
    else if (modalType === 'reject_room') res = await apiRejectRoom(selectedId, remark);
    else if (modalType === 'approve_closure' && selectedClosureId) res = await apiApproveClosure(selectedId, selectedClosureId, remark);
    else if (modalType === 'reject_closure' && selectedClosureId) res = await apiRejectClosure(selectedId, selectedClosureId, remark);

    setActionLoading(false);
    if (res?.success) {
      setModalOpen(false);
      loadData();
    } else {
      alert(res?.message || 'Action failed');
    }
  }

  return (
    <>
      <div className="p-6 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-medium text-[#141413] tracking-tight">HOD Approval Queue</h1>
            <p className="text-[#696969] mt-1">Review pending room creations and closure requests.</p>
          </div>

          <div className="flex gap-4 border-b border-[#141413]/10 pb-px">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rooms' ? 'border-[#141413] text-[#141413]' : 'border-transparent text-[#696969] hover:text-[#141413]'}`}
            >
              Pending Rooms ({pendingRooms.length})
            </button>
            <button
              onClick={() => setActiveTab('closures')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'closures' ? 'border-[#141413] text-[#141413]' : 'border-transparent text-[#696969] hover:text-[#141413]'}`}
            >
              Pending Closures ({pendingClosures.length})
            </button>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            {activeTab === 'rooms' && (
              pendingRooms.length === 0 ? (
                <p className="text-[#696969] text-center py-10">No rooms pending approval.</p>
              ) : (
                <div className="space-y-4">
                  {pendingRooms.map(room => (
                    <div key={room.id} className="flex justify-between items-center p-4 border border-[#141413]/10 rounded-[16px]">
                      <div>
                        <h4 className="font-medium text-[#141413]">{room.projectName} - {room.city}</h4>
                        <p className="text-sm text-[#696969] mt-1">Rent: ₹{room.monthlyRent} | Submitted by: {room.createdBy?.name}</p>
                        <Link href={`/rent/rooms/${room.id}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">View Details</Link>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openModal('reject_room', room.id)} className="px-4 py-2 border border-red-500 text-red-600 text-xs font-medium rounded-full hover:bg-red-50">Reject</button>
                        <button onClick={() => openModal('approve_room', room.id)} className="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-full hover:bg-green-700">Approve</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'closures' && (
              pendingClosures.length === 0 ? (
                <p className="text-[#696969] text-center py-10">No closures pending approval.</p>
              ) : (
                <div className="space-y-4">
                  {pendingClosures.map(closure => (
                    <div key={closure.id} className="flex justify-between items-center p-4 border border-[#141413]/10 rounded-[16px]">
                      <div>
                        <h4 className="font-medium text-[#141413]">{closure.room.projectName} - {closure.room.roomNumber} ({closure.room.city})</h4>
                        <p className="text-sm text-[#696969] mt-1">Requested by: {closure.requestedBy?.name}</p>
                        <p className="text-sm text-[#696969] mt-1">Reason: {closure.reason}</p>
                        <p className="text-xs text-[#696969] mt-1">Date: {new Date(closure.closureDate).toLocaleDateString('en-IN')}</p>
                        <Link href={`/rent/rooms/${closure.roomId}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">View Room</Link>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openModal('reject_closure', closure.roomId, closure.id)} className="px-4 py-2 border border-red-500 text-red-600 text-xs font-medium rounded-full hover:bg-red-50">Reject</button>
                        <button onClick={() => openModal('approve_closure', closure.roomId, closure.id)} className="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-full hover:bg-green-700">Approve</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-medium text-[#141413] mb-2">
              {modalType.includes('approve') ? 'Approve' : 'Reject'} {modalType.includes('room') ? 'Room' : 'Closure'}
            </h3>
            <p className="text-sm text-[#696969] mb-6">
              {modalType.includes('reject') ? 'A reason is required to reject.' : 'You can optionally add a remark.'}
            </p>
            
            {(modalType.includes('reject') || modalType === 'approve_closure') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#141413] mb-1.5">Remark / Reason {modalType.includes('reject') && <span className="text-red-500">*</span>}</label>
                <textarea
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-sm focus:outline-none resize-none"
                  rows={3}
                  placeholder="Enter remarks..."
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 rounded-[16px] border border-[#141413] text-[#141413] text-sm font-medium hover:bg-[#141413]/5 transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={actionLoading || (modalType.includes('reject') && !remark.trim())}
                className={`flex-1 py-3 rounded-[16px] text-white text-sm font-medium disabled:opacity-60 transition-colors ${modalType.includes('approve') ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {actionLoading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
