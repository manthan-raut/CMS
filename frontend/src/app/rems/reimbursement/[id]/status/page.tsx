'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getReimbursementDetails } from '@/lib/rems-api';

export default function ReimbursementStatusPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await getReimbursementDetails(id as string);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    if (id) fetchDetails();
  }, [id]);

  if (!data) return <div>Loading...</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Status Tracker</h1>
        <Badge className={getStatusColor(data.status)}>{data.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Reference Number</p>
            <p className="font-semibold">{data.referenceNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project</p>
            <p className="font-semibold">{data.projectName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Submitted By</p>
            <p className="font-semibold">{data.employee?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="font-semibold text-lg">₹{Number(data.totalAmount).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-4 h-4 mt-1 rounded-full bg-blue-500 shrink-0" />
            <div>
              <p className="font-semibold">Submitted</p>
              <p className="text-sm text-muted-foreground">{new Date(data.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className={`w-4 h-4 mt-1 rounded-full shrink-0 ${data.managerRemark ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div>
              <p className="font-semibold">Manager Review</p>
              {data.managerRemark ? (
                <>
                  <p className="text-sm">Remark: {data.managerRemark}</p>
                  <p className="text-sm text-muted-foreground">Action taken</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Pending manager approval</p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className={`w-4 h-4 mt-1 rounded-full shrink-0 ${data.paidAt ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div>
              <p className="font-semibold">Finance Processing & Payment</p>
              {data.paidAt ? (
                <>
                  <p className="text-sm">Remark: {data.financeRemark}</p>
                  <p className="text-sm text-muted-foreground">Paid on {new Date(data.paidAt).toLocaleString()}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {data.status === 'REJECTED' ? 'Request Rejected' : 'Pending finance processing'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
