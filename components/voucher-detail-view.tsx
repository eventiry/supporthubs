"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { VoucherDetail } from "@/lib/types";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import { Share2, Trash2, Ban, Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Print-friendly content for a voucher (used in print window and preview). */
export function VoucherPrintContent({ voucher }: { voucher: VoucherDetail }) {
  return (
    <div className="space-y-4 rounded-lg border bg-white p-6 print:border-0 print:shadow-none">
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold">Food Bank Voucher</h2>
        <p className="mt-1 font-mono text-xl font-bold">{voucher.code}</p>
        <p className="text-sm text-muted-foreground">
          Valid until: {formatDate(voucher.expiryDate)}
        </p>
      </div>
      <section>
        <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
        <p className="font-medium">
          {voucher.client.firstName} {voucher.client.surname}
        </p>
        <p className="text-sm">
          {voucher.client.noFixedAddress
            ? "No fixed address"
            : voucher.client.postcode ?? "—"}
          {voucher.client.address && ` · ${voucher.client.address}`}
        </p>
      </section>
      <section>
        <h3 className="text-sm font-medium text-muted-foreground">
          Referral agency
        </h3>
        <p>{voucher.agency.name}</p>
        {(voucher.agency.contactPhone || voucher.agency.contactEmail) && (
          <p className="text-sm">
            {voucher.agency.contactPhone}
            {voucher.agency.contactPhone && voucher.agency.contactEmail && " · "}
            {voucher.agency.contactEmail}
          </p>
        )}
      </section>
      <section>
        <h3 className="text-sm font-medium text-muted-foreground">
          Reason for referral
        </h3>
        <p className="whitespace-pre-wrap text-sm">{voucher.referralDetails.notes}</p>
        {voucher.referralDetails.dietaryRequirements && (
          <p className="mt-1 text-sm">
            Dietary: {voucher.referralDetails.dietaryRequirements}
          </p>
        )}
        {voucher.referralDetails.parcelNotes && (
          <p className="mt-1 text-sm">
            Parcel notes: {voucher.referralDetails.parcelNotes}
          </p>
        )}
      </section>
      {voucher.foodBankCenter && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground">
            Collection centre
          </h3>
          <p>{voucher.foodBankCenter.name}</p>
          {voucher.foodBankCenter.address && (
            <p className="text-sm">{voucher.foodBankCenter.address}</p>
          )}
          {(voucher.foodBankCenter.postcode || voucher.foodBankCenter.phone) && (
            <p className="text-sm">
              {voucher.foodBankCenter.postcode}
              {voucher.foodBankCenter.postcode && voucher.foodBankCenter.phone && " · "}
              {voucher.foodBankCenter.phone}
            </p>
          )}
          {voucher.foodBankCenter.email && (
            <p className="text-sm">{voucher.foodBankCenter.email}</p>
          )}
        </section>
      )}
      <p className="pt-4 text-xs text-muted-foreground">
        Issued: {formatDate(voucher.issueDate)} · Code: {voucher.code}
      </p>
    </div>
  );
}

/** Wrapper that triggers window.print() when mounted (for ?print=1 page). */
export function VoucherPrintView({ content }: { content: React.ReactNode }) {
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(t);
  }, []);
  return <div className="min-h-screen bg-white p-6">{content}</div>;
}

export type VoucherDetailViewVariant = "page" | "dialog";

export interface VoucherDetailViewProps {
  voucher: VoucherDetail;
  variant?: VoucherDetailViewVariant;
  /** For dialog: called after invalidate or delete so parent can close and refresh */
  onInvalidated?: () => void;
  onDeleted?: () => void;
  /** Back link href (page variant only) */
  backHref?: string;
}

export function VoucherDetailView({
  voucher,
  variant = "page",
  onInvalidated,
  onDeleted,
  backHref = "/dashboard/vouchers",
}: VoucherDetailViewProps) {
  const [actionLoading, setActionLoading] = useState<"invalidate" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [confirmInvalidateOpen, setConfirmInvalidateOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const router = useRouter();
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const voucherUrl = `${baseUrl}/dashboard/vouchers/${voucher.id}`;

  useEffect(() => {
    if (!isPrinting) return;
    const t = setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 400);
    return () => clearTimeout(t);
  }, [isPrinting]);

  const handlePrint = () => {
    setIsPrinting(true);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Voucher ${voucher.code}`,
          url: voucherUrl,
          text: `Food bank voucher ${voucher.code}`,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(voucherUrl);
        }
      }
    } else {
      copyToClipboard(voucherUrl);
    }
  };

  const handleInvalidate = async () => {
    if (voucher.status !== "issued") return;
    setConfirmInvalidateOpen(false);
    setActionError(null);
    setActionLoading("invalidate");
    try {
      await api.vouchers.invalidate(voucher.id);
      onInvalidated?.();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    setActionError(null);
    setActionLoading("delete");
    try {
      await api.vouchers.delete(voucher.id);
      onDeleted?.();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const isPage = variant === "page";
  const canInvalidate = voucher.status === "issued";
  const canDelete = true; // API will reject if redeemed

  return (
    <div className="space-y-6">
      {isPrinting && (
        <div className="voucher-print-only" aria-hidden>
          <VoucherPrintContent voucher={voucher} />
        </div>
      )}
      {isPage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
          <Link href={backHref}><ArrowLeft className="h-8 w-8 mr-4 cursor-pointer rounded-full hover:bg-muted/80 p-1 text-foreground" onClick={() => router.back()} /></Link>
            <h1 className="text-xl font-semibold text-foreground">Voucher</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} type="button">
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} type="button">
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
            {canInvalidate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmInvalidateOpen(true)}
                disabled={!!actionLoading}
                type="button"
              >
                <Ban className="h-4 w-4 mr-1.5" />
                {actionLoading === "invalidate" ? "Invalidating…" : "Invalidate"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={!!actionLoading}
              type="button"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {actionLoading === "delete" ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-mono">{voucher.code}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Status: <span className="capitalize">{voucher.status}</span> · Issued:{" "}
            {formatDate(voucher.issueDate)} · Expiry: {formatDate(voucher.expiryDate)}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
            <p>
              {voucher.client.firstName} {voucher.client.surname}
            </p>
            <p className="text-sm">
              {voucher.client.noFixedAddress
                ? "No fixed address"
                : voucher.client.postcode ?? "—"}
            </p>
          </section>
          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Agency</h3>
            <p>{voucher.agency.name}</p>
          </section>
          <section>
            <h3 className="text-sm font-medium text-muted-foreground">
              Referral details
            </h3>
            <p className="whitespace-pre-wrap text-sm">
              {voucher.referralDetails.notes}
            </p>
            {voucher.referralDetails.incomeSource && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Income source:</span> {voucher.referralDetails.incomeSource}
              </p>
            )}
            {voucher.referralDetails.moreThan3VouchersReason && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Reason for 3+ vouchers:</span> {voucher.referralDetails.moreThan3VouchersReason}
              </p>
            )}
            {voucher.referralDetails.dietaryRequirements && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Dietary:</span> {voucher.referralDetails.dietaryRequirements}
              </p>
            )}
            {voucher.referralDetails.ethnicGroup && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Ethnic group:</span> {voucher.referralDetails.ethnicGroup}
              </p>
            )}
            {voucher.referralDetails.parcelNotes && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Parcel notes:</span> {voucher.referralDetails.parcelNotes}
              </p>
            )}
          </section>
          {voucher.foodBankCenter && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground">
                Food bank centre
              </h3>
              <p>{voucher.foodBankCenter.name}</p>
              <p className="text-sm">{voucher.foodBankCenter.address}</p>
            </section>
          )}

          {!isPage && (<div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handlePrint} type="button">
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} type="button">
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
            {canInvalidate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmInvalidateOpen(true)}
                disabled={!!actionLoading}
                type="button"
              >
                <Ban className="h-4 w-4 mr-1.5" />
                {actionLoading === "invalidate" ? "Invalidating…" : "Invalidate"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={!!actionLoading}
              type="button"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {actionLoading === "delete" ? "Deleting…" : "Delete"}
            </Button>
          </div>)}
          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmInvalidateOpen} onOpenChange={setConfirmInvalidateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalidate voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              This voucher will be marked as expired and cannot be used. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInvalidate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Invalidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              This voucher will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  }
}
