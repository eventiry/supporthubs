"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { VoucherSummary, VoucherDetail } from "@/lib/types";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import { VoucherDetailView } from "@/components/voucher-detail-view";
import { Loading } from "@/components/ui/loading";
import { Ticket, Receipt } from "lucide-react";
export default function VouchersPage() {
  const { hasPermission } = useRbac();
  const [vouchers, setVouchers] = useState<VoucherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [validityFilter, setValidityFilter] = useState<string>("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [detailVoucher, setDetailVoucher] = useState<VoucherDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const canIssue = hasPermission(Permission.VOUCHER_ISSUE);
  const canRedeem = hasPermission(Permission.VOUCHER_REDEEM);

  useEffect(() => {
    const params: { status?: "issued" | "redeemed" | "expired" | "unfulfilled"; validity?: "valid" | "expired" } = {};
    if (validityFilter === "valid" || validityFilter === "expired") {
      params.validity = validityFilter as "valid" | "expired";
    } else if (
      statusFilter === "issued" ||
      statusFilter === "redeemed" ||
      statusFilter === "expired" ||
      statusFilter === "unfulfilled"
    ) {
      params.status = statusFilter as "issued" | "redeemed" | "expired" | "unfulfilled";
    }
    const hasParams = Object.keys(params).length > 0;
    setLoading(true);
    api.vouchers
      .list(hasParams ? params : undefined)
      .then(setVouchers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [statusFilter, validityFilter]);

  useEffect(() => {
    if (!detailDialogOpen || !selectedVoucherId) {
      setDetailVoucher(null);
      return;
    }
    setDetailLoading(true);
    api.vouchers
      .get(selectedVoucherId)
      .then(setDetailVoucher)
      .catch(() => setDetailVoucher(null))
      .finally(() => setDetailLoading(false));
  }, [detailDialogOpen, selectedVoucherId]);

  const openDetail = (id: string) => {
    setSelectedVoucherId(id);
    setDetailDialogOpen(true);
  };

  const closeDetail = () => {
    setDetailDialogOpen(false);
    setSelectedVoucherId(null);
    setDetailVoucher(null);
  };

  const handleDetailInvalidated = () => {
    closeDetail();
    setLoading(true);
    const params: { status?: "issued" | "redeemed" | "expired" | "unfulfilled"; validity?: "valid" | "expired" } = {};
    if (validityFilter === "valid" || validityFilter === "expired") {
      params.validity = validityFilter as "valid" | "expired";
    } else if (
      statusFilter === "issued" ||
      statusFilter === "redeemed" ||
      statusFilter === "expired" ||
      statusFilter === "unfulfilled"
    ) {
      params.status = statusFilter as "issued" | "redeemed" | "expired" | "unfulfilled";
    }
    api.vouchers
      .list(Object.keys(params).length > 0 ? params : undefined)
      .then(setVouchers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const handleDetailDeleted = () => {
    closeDetail();
    setLoading(true);
    const params: { status?: "issued" | "redeemed" | "expired" | "unfulfilled"; validity?: "valid" | "expired" } = {};
    if (validityFilter === "valid" || validityFilter === "expired") {
      params.validity = validityFilter as "valid" | "expired";
    } else if (
      statusFilter === "issued" ||
      statusFilter === "redeemed" ||
      statusFilter === "expired" ||
      statusFilter === "unfulfilled"
    ) {
      params.status = statusFilter as "issued" | "redeemed" | "expired" | "unfulfilled";
    }
    api.vouchers
      .list(Object.keys(params).length > 0 ? params : undefined)
      .then(setVouchers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">Vouchers</h1>
        <div className="flex gap-2">
          {canIssue && (
            <Button asChild>
              <Link href="/dashboard/vouchers/issue" className="inline-flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Issue voucher
              </Link>
            </Button>
          )}
          {canRedeem && (
            <Button asChild variant="outline">
              <Link href="/dashboard/redeem" className="inline-flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Redeem voucher
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All vouchers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filter by status or validity. Third-party users see only their
            agency’s vouchers. Click a row to view details.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <select
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={validityFilter}
              onChange={(e) => setValidityFilter(e.target.value)}
            >
              <option value="">All validity</option>
              <option value="valid">Valid (issued, not expired)</option>
              <option value="expired">Expired</option>
            </select>
            <select
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="issued">Issued</option>
              <option value="redeemed">Redeemed</option>
              <option value="expired">Expired</option>
              <option value="unfulfilled">Unfulfilled</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <Loading className="p-6" />
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : vouchers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No vouchers found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Expiry date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => (
                  <TableRow
                    key={v.id}
                    className="hover:bg-muted/50"
                    // onClick={() => openDetail(v.id)}
                  >
                    <TableCell className="font-mono text-sm">{v.code}</TableCell>
                    <TableCell>
                      {v.client
                        ? `${v.client.firstName} ${v.client.surname}`
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{v.status}</TableCell>
                    <TableCell>{formatDate(v.issueDate)}</TableCell>
                    <TableCell>{formatDate(v.expiryDate)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDetail(v.id)}
                        >
                          View
                        </Button>
                        {/* <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/vouchers/${v.id}`}>
                            Open page
                          </Link>
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent>
          <DialogHeader className="mb-4">
            <DialogTitle>Voucher details</DialogTitle>
            <DialogDescription>
              View, print, share, invalidate or delete this voucher.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <Loading className="min-h-[200px]" />
          ) : detailVoucher ? (
            <VoucherDetailView
              voucher={detailVoucher}
              variant="dialog"
              onInvalidated={handleDetailInvalidated}
              onDeleted={handleDetailDeleted}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load voucher.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
