'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entityType: '', action: '' });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.entityType) queryParams.append('entityType', filters.entityType);
      if (filters.action) queryParams.append('action', filters.action);
      
      const res = await apiFetch<any[]>(`/api/audit-logs?${queryParams.toString()}`);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Audit Logs</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Input 
              placeholder="Filter by Entity Type (e.g. Room, User)..." 
              value={filters.entityType} 
              onChange={e => setFilters({ ...filters, entityType: e.target.value })}
            />
            <Input 
              placeholder="Filter by Action (e.g. CREATE, APPROVE)..." 
              value={filters.action} 
              onChange={e => setFilters({ ...filters, action: e.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">Loading...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">No logs found</TableCell></TableRow>
                ) : (
                  logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{log.entityType}</TableCell>
                      <TableCell className="text-xs font-mono">{log.entityId}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>{log.performedById}</TableCell>
                      <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
