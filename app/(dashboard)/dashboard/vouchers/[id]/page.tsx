"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { VoucherDetail } from "@/lib/types";
import { Button } from "@/components/button";
import { Loading } from "@/components/ui/loading";
import {
  VoucherDetailView,
  VoucherPrintContent,
  VoucherPrintView,
} from "@/components/voucher-detail-view";

export default function VoucherDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isPrint = searchParams.get("print") === "1";

  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.vouchers
      .get(id)
      .then(setVoucher)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Voucher</h1>
        <Loading />
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Voucher</h1>
        <p className="text-destructive">{error ?? "Voucher not found."}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/vouchers">Back to vouchers</Link>
        </Button>
      </div>
    );
  }

  if (isPrint) {
    return (
      <VoucherPrintView content={<VoucherPrintContent voucher={voucher} />} />
    );
  }

  // Single source of truth: content and actions (Print, Share, Invalidate, Delete) come from VoucherDetailView
  return (

    <VoucherDetailView
      voucher={voucher}
      variant="page"
      backHref="/dashboard/vouchers"
    />
  );
}
