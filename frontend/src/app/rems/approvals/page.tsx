'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getAdvances, getReimbursements, approveAdvance, rejectAdvance, approveReimbursement, rejectReimbursement } from '@/lib/rems-api';

export default function ApprovalsPage() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [reimbursements, setReimbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const advRes = await getAdvances({ status: 'PENDING_MANAGER' });
      setAdvances(advRes.data);
      const reimbRes = await getReimbursements({ status: 'PENDING_MANAGER' });
      setReimbursements(reimbRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (type: 'advance' | 'reimbursement', id: string, action: 'approve' | 'reject') => {
    try {
      let remark = 'Approved';
      if (action === 'reject') {
        remark = prompt('Enter rejection remark:') || '';
        if (!remark) return;
      }

      if (type === 'advance') {
        if (action === 'approve') await approveAdvance(id, remark);
        else await rejectAdvance(id, remark);
      } else {
        if (action === 'approve') await approveReimbursement(id, remark);
        else await rejectReimbursement(id, remark);
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing action');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manager Approval Queue</h1>

      <Tabs defaultValue="advances">
        <TabsList>
          <TabsTrigger value="advances">Advances</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
        </TabsList>

        <TabsContent value="advances">
          <Card>
            <CardHeader><CardTitle>Pending Advances</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Ref No</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : advances.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No advances pending</TableCell></TableRow>
                  ) : (
                    advances.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{a.employee?.name}</TableCell>
                        <TableCell>{a.referenceNumber}</TableCell>
                        <TableCell>₹{Number(a.amount).toLocaleString()}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => handleAction('advance', a.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction('advance', a.id, 'reject')}>Reject</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reimbursements">
          <Card>
            <CardHeader><CardTitle>Pending Reimbursements</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Ref No</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : reimbursements.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No reimbursements pending</TableCell></TableRow>
                  ) : (
                    reimbursements.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.employee?.name}</TableCell>
                        <TableCell>{r.referenceNumber}</TableCell>
                        <TableCell>₹{Number(r.totalAmount).toLocaleString()}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => handleAction('reimbursement', r.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction('reimbursement', r.id, 'reject')}>Reject</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
