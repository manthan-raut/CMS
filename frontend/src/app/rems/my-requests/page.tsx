'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAdvances, getReimbursements } from '@/lib/rems-api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/modules/auth/AuthContext';

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [advances, setAdvances] = useState<any[]>([]);
  const [reimbursements, setReimbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const advRes = await getAdvances({ employeeId: user.id });
        setAdvances(advRes.data || []);
        const reimbRes = await getReimbursements({ employeeId: user.id });
        setReimbursements(reimbRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Requests</h1>

      <Tabs defaultValue="advances">
        <TabsList>
          <TabsTrigger value="advances">Advances</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
        </TabsList>

        <TabsContent value="advances">
          <Card>
            <CardHeader>
              <CardTitle>Advance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref No</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : advances.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No advances found</TableCell></TableRow>
                  ) : (
                    advances.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{a.referenceNumber}</TableCell>
                        <TableCell>{a.projectName}</TableCell>
                        <TableCell>{a.purpose}</TableCell>
                        <TableCell>₹{Number(a.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(a.status)}>{a.status}</Badge>
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
            <CardHeader>
              <CardTitle>Reimbursement Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref No</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : reimbursements.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No reimbursements found</TableCell></TableRow>
                  ) : (
                    reimbursements.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.referenceNumber}</TableCell>
                        <TableCell>{r.projectName}</TableCell>
                        <TableCell>{r.travelActivityDetails}</TableCell>
                        <TableCell>₹{Number(r.totalAmount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
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
