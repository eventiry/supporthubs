"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { VoucherSummary, VoucherDetail, FoodBankCenter } from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";

export default function RedeemPage() {
  const [codeInput, setCodeInput] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<VoucherSummary[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
  const [centers, setCenters] = useState<FoodBankCenter[]>([]);
  const [centerId, setCenterId] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [unfulfilledReason, setUnfulfilledReason] = useState("");
  const [unfulfilledLoading, setUnfulfilledLoading] = useState(false);
  const [unfulfilledSuccess, setUnfulfilledSuccess] = useState(false);

  useEffect(() => {
    api.centers.list().then(setCenters).catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setSearchFeedback(null);
    setSelectedVoucher(null);
    setRedeemSuccess(false);
    setSearchLoading(true);
    try {
      const code = codeInput.trim();
      const hasCode = code.length > 0;

      if (hasCode) {
        // Search by code: fetch any voucher with this code (any status) to show the right message
        const byCode = await api.vouchers.list({ code });
        if (byCode.length === 0) {
          setResults([]);
          setSearchError("No voucher found with that code.");
          return;
        }
        const voucher = byCode[0];
        const now = new Date();
        const isExpired = new Date(voucher.expiryDate) < now;
        if (voucher.status === "redeemed") {
          setResults([]);
          setSearchError("This voucher has already been redeemed.");
          return;
        }
        if (voucher.status === "expired" || (voucher.status === "issued" && isExpired)) {
          setResults([]);
          setSearchError("A voucher with this code was found but it has expired and cannot be redeemed.");
          return;
        }
        // Issued and not expired — show it
        setResults(byCode);
        return;
      }

      // Search by date range only: list issued vouchers
      const params: { status: "issued"; fromDate?: string; toDate?: string } = {
        status: "issued",
      };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const data = await api.vouchers.list(params);
      setResults(data);

      // Give the user clear feedback for date search
      if (data.length > 0) {
        setSearchFeedback(`${data.length} issued voucher(s) found. Select one to redeem.`);
      } else {
        // Check if any vouchers exist in this period (redeemed/expired) so we can tell the user
        const rangeParams: { fromDate?: string; toDate?: string } = {};
        if (fromDate) rangeParams.fromDate = fromDate;
        if (toDate) rangeParams.toDate = toDate;
        const anyInRange =
          fromDate || toDate
            ? await api.vouchers.list(rangeParams).then((list) => list.length)
            : 0;
        setSearchFeedback(
          anyInRange > 0
            ? "No issued vouchers in this date range. There are vouchers in this period that are already redeemed or expired."
            : "No issued vouchers found for this date range."
        );
      }
    } catch (err) {
      setSearchError(getErrorMessage(err));
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function selectVoucher(v: VoucherSummary) {
    setRedeemError(null);
    setRedeemSuccess(false);
    setUnfulfilledSuccess(false);
    try {
      const detail = await api.vouchers.get(v.id);
      setSelectedVoucher(detail);
    } catch (err) {
      setSearchError(getErrorMessage(err));
      setSelectedVoucher(null);
    }
  }

  async function handleMarkFulfilled(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVoucher || !centerId) return;
    setRedeemError(null);
    setRedeemLoading(true);
    try {
      await api.vouchers.redeem(selectedVoucher.id, {
        centerId,
        failureReason: failureReason.trim() || undefined,
      });
      setRedeemSuccess(true);
      setSelectedVoucher(null);
      setResults((prev) => prev.filter((r) => r.id !== selectedVoucher.id));
      setCenterId("");
      setFailureReason("");
    } catch (err) {
      setRedeemError(getErrorMessage(err));
    } finally {
      setRedeemLoading(false);
    }
  }

  async function handleMarkUnfulfilled(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVoucher) return;
    setRedeemError(null);
    setUnfulfilledLoading(true);
    try {
      await api.vouchers.unfulfilled(selectedVoucher.id, {
        reason: unfulfilledReason.trim() || undefined,
      });
      setUnfulfilledSuccess(true);
      setSelectedVoucher(null);
      setResults((prev) => prev.filter((r) => r.id !== selectedVoucher.id));
      setUnfulfilledReason("");
    } catch (err) {
      setRedeemError(getErrorMessage(err));
    } finally {
      setUnfulfilledLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Redeem voucher</h1>

      <Card>
        <CardHeader>
          <CardTitle>Search vouchers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Search by voucher code or date range. Only issued, non-expired
            vouchers can be redeemed.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Voucher code</Label>
              <Input
                id="code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="e.g. E-12345-ABCDEF"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromDate">From date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? "Searching…" : "Search"}
            </Button>
          </form>
          {searchError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {searchError}
            </p>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Matching vouchers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a voucher to view details and mark as fulfilled.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="divide-y rounded-md border">
              {results.map((v) => {
                const expired = new Date(v.expiryDate) < new Date();
                return (
                  <li
                    key={v.id}
                    className={`flex items-center justify-between px-3 py-2 ${
                      selectedVoucher?.id === v.id ? "bg-primary/10" : ""
                    } ${expired ? "opacity-60" : ""}`}
                  >
                    <div>
                      <span className="font-mono font-medium">{v.code}</span>
                      <span className="ml-2 text-muted-foreground">
                        {v.client
                          ? `${v.client.firstName} ${v.client.surname}`
                          : "—"}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        Expires {formatDate(v.expiryDate)}
                        {expired ? " (expired)" : ""}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedVoucher?.id === v.id ? "default" : "outline"}
                      disabled={expired}
                      onClick={() => selectVoucher(v)}
                    >
                      {selectedVoucher?.id === v.id ? "Selected" : "Select"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selectedVoucher}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVoucher(null);
            setRedeemError(null);
            setUnfulfilledSuccess(false);
          }
        }}
      >
        <DialogContent>
          {selectedVoucher && (
            <>
              <DialogHeader>
                <DialogTitle>Voucher details</DialogTitle>
                <DialogDescription>
                  <span className="font-mono text-foreground">{selectedVoucher.code}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
                  <p>
                    {selectedVoucher.client.firstName} {selectedVoucher.client.surname}
                  </p>
                </section>
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Reason for referral
                  </h3>
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedVoucher.referralDetails.notes}
                  </p>
                </section>
                {(selectedVoucher.referralDetails.dietaryRequirements ||
                  selectedVoucher.referralDetails.parcelNotes) && (
                  <section>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Dietary / parcel notes
                    </h3>
                    {selectedVoucher.referralDetails.dietaryRequirements && (
                      <p className="text-sm">
                        Dietary: {selectedVoucher.referralDetails.dietaryRequirements}
                      </p>
                    )}
                    {selectedVoucher.referralDetails.parcelNotes && (
                      <p className="text-sm">
                        Parcel: {selectedVoucher.referralDetails.parcelNotes}
                      </p>
                    )}
                  </section>
                )}

                {redeemSuccess ? (
                  <p className="text-sm font-medium text-primary">
                    Voucher marked as fulfilled successfully.
                  </p>
                ) : unfulfilledSuccess ? (
                  <p className="text-sm font-medium text-primary">
                    Voucher marked as unfulfilled.
                  </p>
                ) : new Date(selectedVoucher.expiryDate) < new Date() ? (
                  <p className="text-sm text-destructive">
                    This voucher has expired and cannot be redeemed.
                  </p>
                ) : (
                  <form onSubmit={handleMarkFulfilled} className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-medium">Mark as fulfilled</h3>
                    <div className="space-y-2">
                      <Label htmlFor="redeem-center">Food bank centre *</Label>
                      <select
                        id="redeem-center"
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        value={centerId}
                        onChange={(e) => setCenterId(e.target.value)}
                        required
                      >
                        <option value="">Select centre</option>
                        {centers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.address ? ` — ${c.address}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {redeemError && (
                      <p className="text-sm text-destructive" role="alert">
                        {redeemError}
                      </p>
                    )}
                    <div className="">
                      <Button type="submit" disabled={redeemLoading || unfulfilledLoading}>
                        {redeemLoading ? "Submitting…" : "Mark as fulfilled"}
                      </Button>
                      <form onSubmit={handleMarkUnfulfilled} className="inline-flex flex-wrap gap-2 items-end">   
                        <div className="space-y-2">
                          <Label htmlFor="redeem-failureReason">Failure reason (optional)</Label>
                          <Input
                            id="redeem-failureReason"
                            value={unfulfilledReason}
                            onChange={(e) => setUnfulfilledReason(e.target.value)}
                            placeholder="If redemption could not be completed"
                            disabled={unfulfilledLoading || redeemLoading}
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={unfulfilledLoading || redeemLoading}
                        >
                          {unfulfilledLoading ? "Marking…" : "Mark as unfulfilled"}
                        </Button>                        
                      </form>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedVoucher(null);
                          setRedeemError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {results.length === 0 && !searchError && !searchFeedback && (
        <p className="text-sm text-muted-foreground">
          Enter a voucher code or date range and click Search to find issued
          vouchers to redeem.
        </p>
      )}
    </div>
  );
}
