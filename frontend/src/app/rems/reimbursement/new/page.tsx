'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submitReimbursement } from '@/lib/rems-api';

import { FileUpload } from '@/components/ui/file-upload';

export default function NewReimbursementPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    projectName: '',
    travelActivityDetails: '',
  });

  const [expenses, setExpenses] = useState([
    { expenseHead: '', amount: '', expenseDate: '', billType: 'INVOICE', documentUrl: '', cashVoucherReason: '' }
  ]);

  const addRow = () => {
    setExpenses([...expenses, { expenseHead: '', amount: '', expenseDate: '', billType: 'INVOICE', documentUrl: '', cashVoucherReason: '' }]);
  };

  const updateRow = (index: number, field: string, value: string) => {
    const updated = [...expenses];
    (updated[index] as any)[field] = value;
    setExpenses(updated);
  };

  const removeRow = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate documents
      const missingDoc = expenses.find(e => !e.documentUrl);
      if (missingDoc) {
        alert('Please upload a document for all expense entries.');
        return;
      }

      const payload = {
        ...form,
        totalAmount,
        expenses: expenses.map(e => ({
          ...e,
          amount: Number(e.amount),
          expenseDate: new Date(e.expenseDate).toISOString()
        }))
      };
      const res = await submitReimbursement(payload);
      alert(`Reimbursement submitted! Ref: ${res.data.referenceNumber}\n\nPlease submit physical hard copy + Xerox set of all bills with covering sheet to Admin/Finance department for audit.`);
      router.push('/rems/my-requests');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error submitting reimbursement');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">New Reimbursement Request</h1>
      <Card>
        <CardHeader><CardTitle>General Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input required value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Travel/Activity Details</label>
              <Input required value={form.travelActivityDetails} onChange={e => setForm({...form, travelActivityDetails: e.target.value})} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Expense Entries</CardTitle>
          <Button variant="outline" type="button" onClick={addRow}>+ Add Expense</Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {expenses.map((exp, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 items-start border p-4 rounded-lg relative">
                <div className="col-span-1 space-y-2">
                  <label className="text-xs font-medium">Head</label>
                  <Input required placeholder="Travel" value={exp.expenseHead} onChange={e => updateRow(index, 'expenseHead', e.target.value)} />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-xs font-medium">Amount (₹)</label>
                  <Input required type="number" min="1" value={exp.amount} onChange={e => updateRow(index, 'amount', e.target.value)} />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-xs font-medium">Date</label>
                  <Input required type="date" value={exp.expenseDate} onChange={e => updateRow(index, 'expenseDate', e.target.value)} />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-xs font-medium">Bill Type</label>
                  <Select value={exp.billType} onValueChange={(val) => updateRow(index, 'billType', val || '')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INVOICE">Invoice</SelectItem>
                      <SelectItem value="CASH_VOUCHER">Cash Voucher</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {exp.billType === 'CASH_VOUCHER' && (
                    <div className="space-y-2 mt-2">
                      <label className="text-xs font-medium">Reason</label>
                      <Input placeholder="If > 10k total" value={exp.cashVoucherReason} onChange={e => updateRow(index, 'cashVoucherReason', e.target.value)} />
                    </div>
                  )}
                </div>
                
                <div className="col-span-2 space-y-2">
                   <FileUpload 
                     label="Bill Document" 
                     onUploadSuccess={(url) => updateRow(index, 'documentUrl', url)} 
                   />
                   {expenses.length > 1 && (
                     <Button type="button" variant="destructive" size="sm" onClick={() => removeRow(index)} className="mt-2 w-full">Remove</Button>
                   )}
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center text-xl font-bold border-t pt-4">
              <span>Total Amount:</span>
              <span>₹{totalAmount.toLocaleString()}</span>
            </div>

            <Button type="submit" className="w-full text-lg h-12">Submit Reimbursement</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
