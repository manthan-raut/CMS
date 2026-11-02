'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitAdvance } from '@/lib/rems-api';

export default function NewAdvancePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    projectName: '',
    purpose: '',
    amount: '',
    expenseHead: '',
    expectedDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        expectedDate: new Date(form.expectedDate).toISOString(),
      };
      await submitAdvance(payload);
      alert('Advance request submitted successfully!');
      router.push('/rems/my-requests');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error submitting advance request');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">New Advance Request</h1>
      <Card>
        <CardHeader><CardTitle>Advance Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input required value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purpose</label>
              <Input required value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input type="number" required min="1" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expense Head</label>
              <Input required placeholder="e.g. Travel, Stationery" value={form.expenseHead} onChange={e => setForm({...form, expenseHead: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Date</label>
              <Input type="date" required value={form.expectedDate} onChange={e => setForm({...form, expectedDate: e.target.value})} />
            </div>
            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
