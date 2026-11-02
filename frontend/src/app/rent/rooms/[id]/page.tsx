'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/modules/auth/AuthContext';
import { apiGetRoom, apiRecordPayment, apiRequestClosure, Room } from '@/lib/rooms-api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_CLOSURE: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-[#141413]/10 text-[#696969]',
};

export default function RoomDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room & { payments: unknown[]; closureRequests: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ paymentMonth: new Date().getMonth() + 1, paymentYear: new Date().getFullYear(), rentAmount: '', advanceAmount: '0', paymentDate: '', remark: '' });
  const [payLoading, setPayLoading] = useState(false);

  // Closure modal
  const [closeModal, setCloseModal] = useState(false);
  const [closeForm, setCloseForm] = useState({ closureDate: '', reason: '', remark: '' });
  const [closeLoading, setCloseLoading] = useState(false);

  const canRecordPayment = user?.role === 'PROJECT_MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'FINANCE_MANAGER';
  const canRequestClosure = user?.role === 'PROJECT_MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'FINANCE_MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiGetRoom(id);
    if (res.success && res.data) setRoom(res.data as typeof room);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function submitPayment() {
    setPayLoading(true);
    await apiRecordPayment(id, {
      ...payForm,
      rentAmount: parseFloat(payForm.rentAmount),
      advanceAmount: parseFloat(payForm.advanceAmount),
      paymentDate: new Date(payForm.paymentDate).toISOString(),
    });
    setPayLoading(false);
    setPayModal(false);
    load();
  }

  async function submitClosure() {
    setCloseLoading(true);
    await apiRequestClosure(id, { ...closeForm, closureDate: new Date(closeForm.closureDate).toISOString() });
    setCloseLoading(false);
    setCloseModal(false);
    router.push('/rent/rooms');
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F3F0EE] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#141413]" />
    </div>
  );

  if (!room) return (
    <div className="min-h-screen bg-[#F3F0EE] flex items-center justify-center">
      <p className="text-[#696969]">Room not found.</p>
    </div>
  );

  const payments = room.payments as { id: string; paymentMonth: number; paymentYear: number; rentAmount: number; advanceAmount: number; paymentDate: string; remark?: string }[];

  return (
    <>
      <div className="min-h-screen bg-[#F3F0EE] p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <button onClick={() => router.push('/rent/rooms')} className="text-xs text-[#696969] hover:text-[#141413] transition-colors mb-2 flex items-center gap-1">
                ← Back to Rooms
              </button>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1 mb-1">
                <span className="text-[#F37338]">•</span> RMS-Rent · Room Detail
              </p>
              <h1 className="text-3xl font-medium text-[#141413] tracking-tight">
                {room.roomNumber ?? 'Awaiting Approval'}
              </h1>
              <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[room.status]}`}>
                {room.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex gap-3">
              {room.status === 'ACTIVE' && canRecordPayment && (
                <button id="record-payment-btn" onClick={() => setPayModal(true)}
                  className="px-5 py-2.5 rounded-[16px] bg-[#141413] text-[#F3F0EE] text-sm font-medium hover:bg-[#262627] transition-colors">
                  + Record Payment
                </button>
              )}
              {room.status === 'ACTIVE' && canRequestClosure && (
                <button id="request-closure-btn" onClick={() => setCloseModal(true)}
                  className="px-5 py-2.5 rounded-[16px] border border-red-500 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                  Request Closure
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Main details */}
            <div className="lg:col-span-2 space-y-5">
              {/* Property Info */}
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <h2 className="text-sm font-bold tracking-[0.04em] uppercase text-[#696969] mb-4">Property</h2>
                <dl className="space-y-3">
                  {[
                    { label: 'Project', value: room.projectName },
                    { label: 'City', value: room.city },
                    { 
                      label: 'Address', 
                      value: (
                        <div className="flex flex-col items-end gap-1">
                          <span>{room.address}</span>
                          <a 
                            href={room.googleMapLocation || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${room.address}, ${room.city}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#F37338] hover:underline font-medium"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            View on Map
                          </a>
                        </div>
                      ) 
                    },
                    { label: 'Monthly Rent', value: `₹${Number(room.monthlyRent).toLocaleString('en-IN')}` },
                    { label: 'Deposit', value: `₹${Number(room.deposit).toLocaleString('en-IN')}` },
                    { label: 'Capacity', value: `${room.occupancyCapacity} person${room.occupancyCapacity > 1 ? 's' : ''}` },
                    { label: 'Electricity', value: room.electricityIncluded ? 'Included' : 'Not Included' },
                    { label: 'Water', value: room.waterIncluded ? 'Included' : 'Not Included' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-[#141413]/5 pb-2 items-start">
                      <dt className="text-sm text-[#696969]">{label}</dt>
                      <dd className="text-sm font-medium text-[#141413] text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <h2 className="text-sm font-bold tracking-[0.04em] uppercase text-[#696969] mb-4">Payment History</h2>
                {payments.length === 0 ? (
                  <p className="text-sm text-[#696969] text-center py-6">No payments recorded yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#141413]/10">
                        <th className="text-left pb-3 text-xs font-bold uppercase text-[#696969]">Month</th>
                        <th className="text-right pb-3 text-xs font-bold uppercase text-[#696969]">Rent</th>
                        <th className="text-right pb-3 text-xs font-bold uppercase text-[#696969]">Advance</th>
                        <th className="text-right pb-3 text-xs font-bold uppercase text-[#696969]">Paid On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-b border-[#141413]/5">
                          <td className="py-3 text-[#141413] font-medium">{MONTHS[p.paymentMonth - 1]} {p.paymentYear}</td>
                          <td className="py-3 text-right text-[#141413]">₹{Number(p.rentAmount).toLocaleString('en-IN')}</td>
                          <td className="py-3 text-right text-[#696969]">₹{Number(p.advanceAmount).toLocaleString('en-IN')}</td>
                          <td className="py-3 text-right text-[#696969]">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <h2 className="text-sm font-bold tracking-[0.04em] uppercase text-[#696969] mb-4">Owner</h2>
                <p className="text-[#141413] font-medium">{room.owner?.name}</p>
                <p className="text-sm text-[#696969] mt-1">{room.owner?.mobile}</p>
              </div>
              {room.broker && (
                <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <h2 className="text-sm font-bold tracking-[0.04em] uppercase text-[#696969] mb-4">Broker</h2>
                  <p className="text-[#141413] font-medium">{room.broker.name}</p>
                  <p className="text-sm text-[#696969] mt-1">{room.broker.mobile}</p>
                </div>
              )}
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <h2 className="text-sm font-bold tracking-[0.04em] uppercase text-[#696969] mb-4">Agreement</h2>
                <p className="text-sm text-[#696969]">Start: <span className="text-[#141413]">{room.agreementStartDate ? new Date(room.agreementStartDate).toLocaleDateString('en-IN') : '—'}</span></p>
                <p className="text-sm text-[#696969] mt-1">End: <span className="text-[#141413]">{room.agreementEndDate ? new Date(room.agreementEndDate).toLocaleDateString('en-IN') : '—'}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-medium text-[#141413] mb-6">Record Rent Payment</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#141413] mb-1.5">Month</label>
                  <select id="pay-month" value={payForm.paymentMonth} onChange={e => setPayForm(p => ({ ...p, paymentMonth: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-sm focus:outline-none">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#141413] mb-1.5">Year</label>
                  <input id="pay-year" type="number" value={payForm.paymentYear} onChange={e => setPayForm(p => ({ ...p, paymentYear: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-sm focus:outline-none" />
                </div>
              </div>
              {[
                { label: 'Rent Amount (₹)', id: 'pay-rent', field: 'rentAmount', type: 'number', placeholder: String(room.monthlyRent) },
                { label: 'Advance Amount (₹)', id: 'pay-advance', field: 'advanceAmount', type: 'number', placeholder: '0' },
                { label: 'Payment Date', id: 'pay-date', field: 'paymentDate', type: 'date', placeholder: '' },
              ].map(f => (
                <div key={f.field}>
                  <label htmlFor={f.id} className="block text-sm font-medium text-[#141413] mb-1.5">{f.label}</label>
                  <input id={f.id} type={f.type} value={payForm[f.field as keyof typeof payForm] as string}
                    onChange={e => setPayForm(p => ({ ...p, [f.field]: e.target.value }))} placeholder={f.placeholder}
                    className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-sm focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button id="pay-cancel" onClick={() => setPayModal(false)} className="flex-1 py-3 rounded-[16px] border border-[#141413] text-[#141413] text-sm font-medium hover:bg-[#141413]/5 transition-colors">Cancel</button>
              <button id="pay-submit" onClick={submitPayment} disabled={payLoading} className="flex-1 py-3 rounded-[16px] bg-[#141413] text-[#F3F0EE] text-sm font-medium disabled:opacity-60 hover:bg-[#262627] transition-colors">
                {payLoading ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closure Modal */}
      {closeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-medium text-[#141413] mb-6">Request Room Closure</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="closure-date" className="block text-sm font-medium text-[#141413] mb-1.5">Proposed Closure Date</label>
                <input id="closure-date" type="date" value={closeForm.closureDate} onChange={e => setCloseForm(p => ({ ...p, closureDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-sm focus:outline-none" />
              </div>
              <div>
                <label htmlFor="closure-reason" className="block text-sm font-medium text-[#141413] mb-1.5">Reason <span className="text-red-500">*</span></label>
                <textarea id="closure-reason" value={closeForm.reason} onChange={e => setCloseForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                  placeholder="Project completed / Room no longer required..."
                  className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-sm focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button id="close-cancel" onClick={() => setCloseModal(false)} className="flex-1 py-3 rounded-[16px] border border-[#141413] text-[#141413] text-sm font-medium hover:bg-[#141413]/5 transition-colors">Cancel</button>
              <button id="close-submit" onClick={submitClosure} disabled={closeLoading || !closeForm.reason} className="flex-1 py-3 rounded-[16px] bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">
                {closeLoading ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
