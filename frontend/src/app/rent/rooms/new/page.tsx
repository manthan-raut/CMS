'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCreateRoom } from '@/lib/rooms-api';
import { FileUpload } from '@/components/ui/file-upload';

type Step = 'broker' | 'owner' | 'property' | 'agreement' | 'summary';
const STEPS: { key: Step; label: string }[] = [
  { key: 'broker', label: 'Broker' },
  { key: 'owner', label: 'Owner' },
  { key: 'property', label: 'Property' },
  { key: 'agreement', label: 'Agreement' },
  { key: 'summary', label: 'Review' },
];

interface FormData {
  // Broker
  hasBroker: boolean;
  brokerName: string; brokerMobile: string; brokerageCharges: string;
  brokerBankName: string; brokerAccountNumber: string; brokerIfscCode: string;
  // Owner
  ownerName: string; ownerMobile: string; ownerAadhaar: string; ownerPan: string;
  ownerBankName: string; ownerAccountNumber: string; ownerIfscCode: string;
  // Property
  projectName: string; city: string; address: string; googleMapLocation: string; facilities: string;
  electricityIncluded: boolean; waterIncluded: boolean; otherUtilities: string;
  startDate: string; monthlyRent: string; deposit: string; occupancyCapacity: string; remark: string;
  // Agreement
  agreementFileUrl: string; agreementStartDate: string; agreementEndDate: string; agreementRemark: string;
}

const defaultForm: FormData = {
  hasBroker: false,
  brokerName: '', brokerMobile: '', brokerageCharges: '',
  brokerBankName: '', brokerAccountNumber: '', brokerIfscCode: '',
  ownerName: '', ownerMobile: '', ownerAadhaar: '', ownerPan: '',
  ownerBankName: '', ownerAccountNumber: '', ownerIfscCode: '',
  projectName: '', city: '', address: '', googleMapLocation: '', facilities: '',
  electricityIncluded: false, waterIncluded: false, otherUtilities: '',
  startDate: '', monthlyRent: '', deposit: '', occupancyCapacity: '1', remark: '',
  agreementFileUrl: '', agreementStartDate: '', agreementEndDate: '', agreementRemark: '',
};

function Input({ label, id, value, onChange, type = 'text', placeholder = '', required = false }:
  { label: string; id: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#141413] mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-[16px] border border-[#141413]/20 bg-[#F3F0EE] text-[#141413] placeholder:text-[#696969] focus:outline-none focus:border-[#141413] transition-colors text-sm" />
    </div>
  );
}

function Toggle({ label, id, checked, onChange }: { label: string; id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 cursor-pointer">
      <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-[#141413]' : 'bg-[#141413]/20'} relative`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
        <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      </div>
      <span className="text-sm text-[#141413]">{label}</span>
    </label>
  );
}

export default function NewRoomPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('broker');
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const stepIndex = STEPS.findIndex(s => s.key === step);

  const set = (field: keyof FormData) => (v: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: v }));

  async function handleSubmit() {
    setError(''); setSubmitting(true);
    const payload = {
      projectName: form.projectName, city: form.city, address: form.address,
      googleMapLocation: form.googleMapLocation || undefined,
      facilities: form.facilities || undefined, electricityIncluded: form.electricityIncluded,
      waterIncluded: form.waterIncluded, otherUtilities: form.otherUtilities || undefined,
      startDate: new Date(form.startDate).toISOString(),
      monthlyRent: parseFloat(form.monthlyRent), deposit: parseFloat(form.deposit || '0'),
      occupancyCapacity: parseInt(form.occupancyCapacity),
      remark: form.remark || undefined,
      agreementStartDate: form.agreementStartDate ? new Date(form.agreementStartDate).toISOString() : undefined,
      agreementEndDate: form.agreementEndDate ? new Date(form.agreementEndDate).toISOString() : undefined,
      agreementRemark: form.agreementRemark || undefined,
      agreementFileUrl: form.agreementFileUrl || undefined,
      owner: { name: form.ownerName, mobile: form.ownerMobile, aadhaar: form.ownerAadhaar || undefined, pan: form.ownerPan || undefined, bankName: form.ownerBankName || undefined, accountNumber: form.ownerAccountNumber || undefined, ifscCode: form.ownerIfscCode || undefined },
      broker: form.hasBroker ? { name: form.brokerName, mobile: form.brokerMobile, brokerageCharges: parseFloat(form.brokerageCharges || '0'), bankName: form.brokerBankName || undefined, accountNumber: form.brokerAccountNumber || undefined, ifscCode: form.brokerIfscCode || undefined } : undefined,
    };
    const res = await apiCreateRoom(payload);
    setSubmitting(false);
    if (res.success) { router.push('/rent/rooms'); }
    else setError(res.message || 'Failed to submit room');
  }

  return (
    <div className="min-h-screen bg-[#F3F0EE] p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1 mb-1">
              <span className="text-[#F37338]">•</span> RMS-Rent
            </p>
            <h1 className="text-3xl font-medium text-[#141413] tracking-tight">New Room Request</h1>
            <p className="text-sm text-[#696969] mt-1">Submit for HOD approval</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                  ${i < stepIndex ? 'bg-[#141413] text-white' : i === stepIndex ? 'bg-[#141413] text-white ring-4 ring-[#141413]/20' : 'bg-[#141413]/10 text-[#696969]'}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === stepIndex ? 'text-[#141413]' : 'text-[#696969]'}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < stepIndex ? 'bg-[#141413]' : 'bg-[#141413]/20'}`} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-8">

            {/* Step 1: Broker */}
            {step === 'broker' && (
              <div className="space-y-5">
                <h2 className="text-xl font-medium text-[#141413] mb-4">Broker Details</h2>
                <Toggle label="This room was sourced through a broker" id="hasBroker" checked={form.hasBroker} onChange={set('hasBroker') as (v: boolean) => void} />
                {form.hasBroker && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                    <Input label="Broker Name" id="brokerName" value={form.brokerName} onChange={set('brokerName') as (v: string) => void} required placeholder="Mahesh Properties" />
                    <Input label="Mobile" id="brokerMobile" value={form.brokerMobile} onChange={set('brokerMobile') as (v: string) => void} required placeholder="98XXXXXXXX" />
                    <Input label="Brokerage Charges (₹)" id="brokerageCharges" value={form.brokerageCharges} onChange={set('brokerageCharges') as (v: string) => void} type="number" placeholder="5000" />
                    <Input label="Bank Name" id="brokerBankName" value={form.brokerBankName} onChange={set('brokerBankName') as (v: string) => void} placeholder="SBI" />
                    <Input label="Account Number" id="brokerAccountNumber" value={form.brokerAccountNumber} onChange={set('brokerAccountNumber') as (v: string) => void} placeholder="XXXXXXXXXXXX" />
                    <Input label="IFSC Code" id="brokerIfscCode" value={form.brokerIfscCode} onChange={set('brokerIfscCode') as (v: string) => void} placeholder="SBIN0000001" />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Owner */}
            {step === 'owner' && (
              <div className="space-y-5">
                <h2 className="text-xl font-medium text-[#141413] mb-4">Owner Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input label="Owner Name" id="ownerName" value={form.ownerName} onChange={set('ownerName') as (v: string) => void} required placeholder="Ramesh Gupta" />
                  <Input label="Mobile" id="ownerMobile" value={form.ownerMobile} onChange={set('ownerMobile') as (v: string) => void} required placeholder="98XXXXXXXX" />
                  <Input label="Aadhaar (for records)" id="ownerAadhaar" value={form.ownerAadhaar} onChange={set('ownerAadhaar') as (v: string) => void} placeholder="0000-0000-0000" />
                  <Input label="PAN (for records)" id="ownerPan" value={form.ownerPan} onChange={set('ownerPan') as (v: string) => void} placeholder="AAAAA0000A" />
                  <Input label="Bank Name" id="ownerBankName" value={form.ownerBankName} onChange={set('ownerBankName') as (v: string) => void} placeholder="HDFC Bank" />
                  <Input label="Account Number" id="ownerAccountNumber" value={form.ownerAccountNumber} onChange={set('ownerAccountNumber') as (v: string) => void} placeholder="XXXXXXXXXXXX" />
                  <Input label="IFSC Code" id="ownerIfscCode" value={form.ownerIfscCode} onChange={set('ownerIfscCode') as (v: string) => void} placeholder="HDFC0000001" />
                </div>
              </div>
            )}

            {/* Step 3: Property */}
            {step === 'property' && (
              <div className="space-y-5">
                <h2 className="text-xl font-medium text-[#141413] mb-4">Property Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input label="Project Name" id="projectName" value={form.projectName} onChange={set('projectName') as (v: string) => void} required placeholder="Survey of Karnataka" />
                  <Input label="City" id="city" value={form.city} onChange={set('city') as (v: string) => void} required placeholder="Bengaluru" />
                  <div className="sm:col-span-2">
                    <Input label="Address" id="address" value={form.address} onChange={set('address') as (v: string) => void} required placeholder="12, MG Road, Bengaluru 560001" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Google Maps Location (URL or Coordinates)" id="googleMapLocation" value={form.googleMapLocation} onChange={set('googleMapLocation') as (v: string) => void} placeholder="e.g., https://maps.google.com/?q=... or 12.9716,77.5946" />
                  </div>
                  <Input label="Facilities" id="facilities" value={form.facilities} onChange={set('facilities') as (v: string) => void} placeholder="AC, WiFi, Parking" />
                  <Input label="Other Utilities" id="otherUtilities" value={form.otherUtilities} onChange={set('otherUtilities') as (v: string) => void} placeholder="Generator, Lift" />
                  <Input label="Start Date" id="startDate" value={form.startDate} onChange={set('startDate') as (v: string) => void} type="date" required />
                  <Input label="Monthly Rent (₹)" id="monthlyRent" value={form.monthlyRent} onChange={set('monthlyRent') as (v: string) => void} type="number" required placeholder="18000" />
                  <Input label="Deposit (₹)" id="deposit" value={form.deposit} onChange={set('deposit') as (v: string) => void} type="number" placeholder="36000" />
                  <Input label="Occupancy Capacity" id="occupancyCapacity" value={form.occupancyCapacity} onChange={set('occupancyCapacity') as (v: string) => void} type="number" placeholder="4" />
                </div>
                <div className="flex gap-6 pt-2">
                  <Toggle label="Electricity Included" id="electricityIncluded" checked={form.electricityIncluded} onChange={set('electricityIncluded') as (v: boolean) => void} />
                  <Toggle label="Water Included" id="waterIncluded" checked={form.waterIncluded} onChange={set('waterIncluded') as (v: boolean) => void} />
                </div>
                <Input label="Remark" id="remark" value={form.remark} onChange={set('remark') as (v: string) => void} placeholder="Any notes..." />
              </div>
            )}

            {/* Step 4: Agreement */}
            {step === 'agreement' && (
              <div className="space-y-5">
                <h2 className="text-xl font-medium text-[#141413] mb-4">Agreement Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input label="Agreement Start Date" id="agreementStartDate" value={form.agreementStartDate} onChange={set('agreementStartDate') as (v: string) => void} type="date" />
                  <Input label="Agreement End Date" id="agreementEndDate" value={form.agreementEndDate} onChange={set('agreementEndDate') as (v: string) => void} type="date" />
                  <Input label="Agreement Remark" id="agreementRemark" value={form.agreementRemark} onChange={set('agreementRemark') as (v: string) => void} placeholder="Annual lease / monthly rollover" />
                </div>
                <div className="mt-4">
                  <FileUpload 
                    label="Agreement Document"
                    onUploadSuccess={(url) => set('agreementFileUrl')(url)}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Summary */}
            {step === 'summary' && (
              <div className="space-y-4">
                <h2 className="text-xl font-medium text-[#141413] mb-4">Review & Submit</h2>
                {[
                  { label: 'Project', value: form.projectName },
                  { label: 'City', value: form.city },
                  { label: 'Monthly Rent', value: `₹${form.monthlyRent}` },
                  { label: 'Deposit', value: `₹${form.deposit || '0'}` },
                  { label: 'Owner', value: form.ownerName },
                  { label: 'Broker', value: form.hasBroker ? form.brokerName : 'None' },
                  { label: 'Start Date', value: form.startDate },
                  { label: 'Agreement', value: form.agreementStartDate ? `${form.agreementStartDate} → ${form.agreementEndDate}` : 'Not specified' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2 border-b border-[#141413]/10">
                    <span className="text-sm text-[#696969]">{row.label}</span>
                    <span className="text-sm font-medium text-[#141413]">{row.value || '—'}</span>
                  </div>
                ))}
                {error && <div className="px-4 py-3 rounded-[16px] bg-red-50 border border-red-200 text-red-700 text-sm mt-4">{error}</div>}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-[#141413]/10">
              <button
                id="room-form-back"
                onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].key)}
                disabled={stepIndex === 0}
                className="px-6 py-2.5 rounded-[16px] border border-[#141413] text-[#141413] text-sm font-medium hover:bg-[#141413]/5 disabled:opacity-30 transition-colors"
              >
                ← Back
              </button>
              {stepIndex < STEPS.length - 1 ? (
                <button
                  id="room-form-next"
                  onClick={() => setStep(STEPS[stepIndex + 1].key)}
                  className="px-6 py-2.5 rounded-[16px] bg-[#141413] text-[#F3F0EE] text-sm font-medium hover:bg-[#262627] transition-colors"
                >
                  Next →
                </button>
              ) : (
                <button
                  id="room-form-submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-2.5 rounded-[16px] bg-[#141413] text-[#F3F0EE] text-sm font-medium hover:bg-[#262627] disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit for Approval'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
