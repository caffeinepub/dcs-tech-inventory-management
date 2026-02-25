import { useState, useMemo } from 'react';
import { BarChart3, Search, Calendar, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdjustmentLogs, useGetCallerUserProfile, getRoleString } from '../hooks/useQueries';
import type { AdjustmentLog } from '../backend';
import { Shield } from 'lucide-react';

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function Reports() {
  const { data: userProfile } = useGetCallerUserProfile();
  const role = userProfile ? getRoleString(userProfile.role) : 'guest';
  const canView = role === 'admin' || role === 'staff';

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Reports are only accessible to staff and administrators.</p>
        </div>
      </div>
    );
  }

  return <ReportsContent />;
}

function ReportsContent() {
  const { data: logs, isLoading } = useAdjustmentLogs();
  const [searchItem, setSearchItem] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredLogs = useMemo(() => {
    if (!logs) return [];

    return [...logs]
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .filter((log: AdjustmentLog) => {
        // Item name filter
        if (searchItem && !log.itemName.toLowerCase().includes(searchItem.toLowerCase())) {
          return false;
        }

        // Date range filter
        const logMs = Number(log.timestamp) / 1_000_000;
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (logMs < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate).getTime() + 86400000; // include end day
          if (logMs > end) return false;
        }

        return true;
      });
  }, [logs, searchItem, startDate, endDate]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Inventory adjustment history and analytics
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="search-item" className="text-xs text-muted-foreground">Item Name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="search-item"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                placeholder="Search items..."
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start-date" className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end-date" className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> End Date
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        {(searchItem || startDate || endDate) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {logs?.length ?? 0} records
            </span>
            <button
              onClick={() => { setSearchItem(''); setStartDate(''); setEndDate(''); }}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No adjustment logs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchItem || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Inventory adjustments will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Date/Time</TableHead>
                  <TableHead className="font-semibold text-foreground">Item</TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell">User</TableHead>
                  <TableHead className="font-semibold text-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">New Qty</TableHead>
                  <TableHead className="font-semibold text-foreground hidden lg:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: AdjustmentLog) => {
                  const isAdd = JSON.stringify(log.adjustmentType).includes('add');
                  return (
                    <TableRow key={String(log.id)} className="border-border hover:bg-accent/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{log.itemName}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {log.adjustedByEmail || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {isAdd ? (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs">
                            Add
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                            Remove
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-semibold ${isAdd ? 'text-success' : 'text-destructive'}`}>
                        {isAdd ? '+' : '-'}{String(log.amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-foreground">
                        {String(log.newQuantity)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="pt-4 text-center border-t border-border">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} DCS Tech · Built with{' '}
          <span className="text-destructive">♥</span>{' '}
          using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'dcs-tech-inventory')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
