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

function formatHouseholdByAge(householdByAge: unknown): string {
  if (householdByAge == null || typeof householdByAge !== "object") return "—";
  const obj = householdByAge as Record<string, number>;
  const parts = Object.entries(obj)
    .filter(([, n]) => n != null && Number(n) > 0)
    .map(([label, n]) => `${label}: ${n}`);
  return parts.length ? parts.join(", ") : "—";
}

function totalPeopleFromHousehold(householdByAge: unknown): number {
  if (householdByAge == null || typeof householdByAge !== "object") return 0;
  const obj = householdByAge as Record<string, number>;
  return Object.values(obj).reduce((sum, n) => sum + (typeof n === "number" && n > 0 ? n : 0), 0);
}

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
  const [fulfillmentWeightKg, setFulfillmentWeightKg] = useState("");
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
      // Pre-select the food bank centre assigned at issue (if any)
      setCenterId(detail.foodBankCenter?.id ?? "");
      setFulfillmentWeightKg("");
      setFailureReason("");
      setUnfulfilledReason("");
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
      const weightKgVal = fulfillmentWeightKg.trim()
        ? parseFloat(fulfillmentWeightKg)
        : undefined;
      await api.vouchers.redeem(selectedVoucher.id, {
        centerId,
        failureReason: failureReason.trim() || undefined,
        weightKg:
          weightKgVal != null &&
          !Number.isNaN(weightKgVal) &&
          weightKgVal >= 0
            ? weightKgVal
            : undefined,
      });
      setRedeemSuccess(true);
      setSelectedVoucher(null);
      setResults((prev) => prev.filter((r) => r.id !== selectedVoucher.id));
      setCenterId("");
      setFulfillmentWeightKg("");
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
              <div className="space-y-4 pr-1">
                {/* Comprehensive voucher details (as issued) */}
                <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Details from issue</h3>
                  <section>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</h4>
                    <p className="text-sm font-medium">
                      {selectedVoucher.client.firstName} {selectedVoucher.client.surname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVoucher.client.noFixedAddress
                        ? "No fixed address"
                        : selectedVoucher.client.postcode ?? "—"}
                    </p>
                  </section>
                  <section>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agency</h4>
                    <p className="text-sm">{selectedVoucher.agency.name}</p>
                  </section>
                  <section>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dates</h4>
                    <p className="text-sm">
                      Issued {formatDate(selectedVoucher.issueDate)} · Expires {formatDate(selectedVoucher.expiryDate)}
                    </p>
                  </section>
                  {selectedVoucher.weightKg != null && (
                    <section>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weight at issue</h4>
                      <p className="text-sm">{selectedVoucher.weightKg} kg</p>
                    </section>
                  )}
                  {selectedVoucher.collectionNotes && (
                    <section>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collection notes</h4>
                      <p className="text-sm whitespace-pre-wrap">{selectedVoucher.collectionNotes}</p>
                    </section>
                  )}
                  <section>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Referral details</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedVoucher.referralDetails.notes}</p>
                    {selectedVoucher.referralDetails.referralReasons != null &&
                      typeof selectedVoucher.referralDetails.referralReasons === "object" && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Reasons:</span>{" "}
                          {Array.isArray(selectedVoucher.referralDetails.referralReasons)
                            ? (selectedVoucher.referralDetails.referralReasons as string[]).join(", ")
                            : String(selectedVoucher.referralDetails.referralReasons)}
                        </p>
                      )}
                    {selectedVoucher.referralDetails.householdByAge != null &&
                      typeof selectedVoucher.referralDetails.householdByAge === "object" && (
                        <>
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">People (by age):</span>{" "}
                            {formatHouseholdByAge(selectedVoucher.referralDetails.householdByAge)}
                          </p>
                          {totalPeopleFromHousehold(selectedVoucher.referralDetails.householdByAge) > 0 && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Total people:</span>{" "}
                              {totalPeopleFromHousehold(selectedVoucher.referralDetails.householdByAge)}
                            </p>
                          )}
                        </>
                      )}
                    {selectedVoucher.referralDetails.incomeSource && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Income source:</span> {selectedVoucher.referralDetails.incomeSource}
                      </p>
                    )}
                    {selectedVoucher.referralDetails.moreThan3VouchersReason && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Reason for 3+ vouchers:</span> {selectedVoucher.referralDetails.moreThan3VouchersReason}
                      </p>
                    )}
                    {selectedVoucher.referralDetails.dietaryRequirements && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Dietary:</span> {selectedVoucher.referralDetails.dietaryRequirements}
                      </p>
                    )}
                    {selectedVoucher.referralDetails.ethnicGroup && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Ethnic group:</span> {selectedVoucher.referralDetails.ethnicGroup}
                      </p>
                    )}
                    {selectedVoucher.referralDetails.parcelNotes && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Parcel notes:</span> {selectedVoucher.referralDetails.parcelNotes}
                      </p>
                    )}
                  </section>
                  {selectedVoucher.foodBankCenter && (
                    <section>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned food bank centre (at issue)</h4>
                      <p className="text-sm font-medium">{selectedVoucher.foodBankCenter.name}</p>
                      {selectedVoucher.foodBankCenter.address && (
                        <p className="text-xs text-muted-foreground">{selectedVoucher.foodBankCenter.address}</p>
                      )}
                    </section>
                  )}
                </div>

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
                  <div className="space-y-5 border-t pt-4">
                    {redeemError && (
                      <p className="text-sm text-destructive" role="alert">
                        {redeemError}
                      </p>
                    )}

                    <form onSubmit={handleMarkFulfilled} className="space-y-4 rounded-lg border border-border bg-background p-4">
                      <h3 className="text-sm font-semibold">Mark as fulfilled</h3>
                      <div className="space-y-2">
                        <Label htmlFor="redeem-center">Food bank centre where fulfilled *</Label>
                        <select
                          id="redeem-center"
                          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                          value={centerId}
                          onChange={(e) => setCenterId(e.target.value)}
                          required
                        >
                          <option value="">Select centre</option>
                          {selectedVoucher.foodBankCenter && (
                            <option value={selectedVoucher.foodBankCenter.id}>
                              {selectedVoucher.foodBankCenter.name}
                              {selectedVoucher.foodBankCenter.address ? ` — ${selectedVoucher.foodBankCenter.address}` : ""}
                              {" — Assigned at issue"}
                            </option>
                          )}
                          {centers
                            .filter((c) => c.id !== selectedVoucher.foodBankCenter?.id)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.address ? ` — ${c.address}` : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="redeem-weightKg">Fulfillment weight (kg, optional)</Label>
                        <Input
                          id="redeem-weightKg"
                          type="number"
                          min={0}
                          step={0.1}
                          placeholder={selectedVoucher.weightKg != null ? `Override: e.g. ${selectedVoucher.weightKg}` : "Actual weight at collection"}
                          value={fulfillmentWeightKg}
                          onChange={(e) => setFulfillmentWeightKg(e.target.value)}
                          disabled={redeemLoading || unfulfilledLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave blank to use weight as issued, or enter actual weight at fulfillment.
                        </p>
                      </div>
                      <Button type="submit" disabled={redeemLoading || unfulfilledLoading} className="w-full sm:w-auto">
                        {redeemLoading ? "Submitting…" : "Mark as fulfilled"}
                      </Button>
                    </form>

                    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground">Unable to fulfill?</h3>
                      <form onSubmit={handleMarkUnfulfilled} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                        <div className="space-y-2 flex-1 min-w-0">
                          <Label htmlFor="redeem-failureReason">Failure reason (optional)</Label>
                          <Input
                            id="redeem-failureReason"
                            value={unfulfilledReason}
                            onChange={(e) => setUnfulfilledReason(e.target.value)}
                            placeholder="e.g. Client did not attend"
                            disabled={unfulfilledLoading || redeemLoading}
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={unfulfilledLoading || redeemLoading}
                          className="sm:shrink-0"
                        >
                          {unfulfilledLoading ? "Marking…" : "Mark as unfulfilled"}
                        </Button>
                      </form>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedVoucher(null);
                          setRedeemError(null);
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
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
