'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getAdvances, getReimbursements, processAdvancePayment, processReimbursementPayment } from '@/lib/rems-api';

export default function FinanceQueuePage() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [reimbursements, setReimbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const advRes = await getAdvances({ status: 'PENDING_FINANCE' });
      setAdvances(advRes.data);
      const reimbRes = await getReimbursements({ status: 'PENDING_FINANCE' });
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

  const handlePay = async (type: 'advance' | 'reimbursement', id: string) => {
    try {
      const remark = prompt('Enter payment remark (e.g. Transaction ID):') || 'Processed';
      if (type === 'advance') {
        await processAdvancePayment(id, remark);
      } else {
        await processReimbursementPayment(id, remark);
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing payment');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finance Processing Queue</h1>

      <Tabs defaultValue="advances">
        <TabsList>
          <TabsTrigger value="advances">Advances</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
        </TabsList>

        <TabsContent value="advances">
          <Card>
            <CardHeader><CardTitle>Pending Advance Payments</CardTitle></CardHeader>
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
                        <TableCell>
                          <Button size="sm" onClick={() => handlePay('advance', a.id)}>Mark Paid</Button>
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
            <CardHeader><CardTitle>Pending Reimbursement Payments</CardTitle></CardHeader>
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
                        <TableCell>
                          <Button size="sm" onClick={() => handlePay('reimbursement', r.id)}>Mark Paid</Button>
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
