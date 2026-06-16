"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import { useSession } from "@/lib/contexts/session-context";
import { isOrgInSelectedOrgsClient } from "@/lib/config";
import type {
  ClientSearchResult,
  ClientWithVouchers,
  ReferralDetailsPayload,
  Agency,
  FoodBankCenter,
} from "@/lib/types";
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
import { CreateClientForm } from "@/components/create-client-form";
import { CenterForm } from "@/components/center-form";
import { ETHNIC_GROUP_OPTIONS } from "@/lib/client-demographics";
import { HOUSEHOLD_AGE_BANDS } from "@/lib/analytics/household";
import {
  MoreThan3VouchersReasonFields,
  hasMoreThan3VouchersReason,
  buildMultiSelectWithOther,
  parseMultiSelectWithOther,
  MORE_THAN_3_OTHER_LABEL,
} from "@/components/vouchers/more-than-3-vouchers-reason";

const STEPS = 6;
const NOTES_MAX = 400;
const PARCEL_NOTES_MAX = 400;
const MORE_THAN_3_VOUCHERS_ERROR =
  "3 or more vouchers in the last 6 months";

/** Dietary requirements — multi-select options. */
const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-free",
  "Dairy-free",
  "Nut allergy",
] as const;
const DIETARY_OTHER_LABEL = "Other";

/** Income source — single-select options (from reference). */
const INCOME_SOURCE_OPTIONS = [
  "Earning, no benefits",
  "Earning and benefits",
  "Benefits, not earning",
  "Income but no or insufficient access to it",
  "No income",
  "Declined to answer",
  "Unable to ask",
] as const;
const INCOME_SOURCE_OTHER_LABEL = "Other";

const NA_LABEL = "N/A";

export default function IssueVoucherWizardPage() {
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId");
  const { hasPermission } = useRbac();
  const { user } = useSession();
  const selectedOrgsRules = isOrgInSelectedOrgsClient(user?.organizationId ?? null);
  const canManageAgenciesAndCenters = hasPermission(Permission.USER_MANAGE);

  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState({ firstName: "", surname: "", postcode: "", noFixedAddress: false });
  const [searchResults, setSearchResults] = useState<ClientSearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithVouchers | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [centers, setCenters] = useState<FoodBankCenter[]>([]);
  const [referral, setReferral] = useState<ReferralDetailsPayload>({
    notes: "",
    contactConsent: false,
    dietaryConsent: false,
    incomeSource: undefined,
    dietaryRequirements: undefined,
  });
  const [agencyId, setAgencyId] = useState("");
  const [foodBankCenterId, setFoodBankCenterId] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [vouchersInLast6Months, setVouchersInLast6Months] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdVoucherId, setCreatedVoucherId] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [addAgencyDialogOpen, setAddAgencyDialogOpen] = useState(false);
  const [addCenterDialogOpen, setAddCenterDialogOpen] = useState(false);
  const [addAgencyName, setAddAgencyName] = useState("");
  const [addAgencyPhone, setAddAgencyPhone] = useState("");
  const [addAgencyEmail, setAddAgencyEmail] = useState("");
  const [addAgencyLoading, setAddAgencyLoading] = useState(false);
  const [addAgencyError, setAddAgencyError] = useState<string | null>(null);
  const [addCenterLoading, setAddCenterLoading] = useState(false);
  const [addCenterError, setAddCenterError] = useState<string | null>(null);

  function prefillReferralFromClient(client: ClientWithVouchers) {
    setReferral((r) => ({
      ...r,
      ...(client.ethnicGroup ? { ethnicGroup: client.ethnicGroup } : {}),
      ...(client.householdByAge != null && typeof client.householdByAge === "object"
        ? { householdByAge: client.householdByAge as Record<string, number> }
        : {}),
    }));
  }

  async function loadClientForIssue(client: ClientWithVouchers, countFromSearch?: number) {
    setSelectedClient(client);
    const count =
      countFromSearch ??
      client.vouchersInLast6Months ??
      (await api.clients.get(client.id)).vouchersInLast6Months ??
      0;
    setVouchersInLast6Months(count);
    prefillReferralFromClient(client);
  }

  useEffect(() => {
    if (clientIdParam && !selectedClient) {
      api.clients
        .get(clientIdParam)
        .then(async (c) => {
          await loadClientForIssue(c);
          setStep(2);
        })
        .catch(() => {});
    }
  }, [clientIdParam, selectedClient]);

  useEffect(() => {
    if (step === 3 && selectedClient?.id) {
      api.clients
        .get(selectedClient.id)
        .then((c) => {
          setVouchersInLast6Months(c.vouchersInLast6Months ?? 0);
          prefillReferralFromClient(c);
        })
        .catch(() => {});
    }
  }, [step, selectedClient?.id]);

  useEffect(() => {
    api.agencies.list().then(setAgencies).catch(() => {});
    api.centers.list().then(setCenters).catch(() => {});
  }, []);

  const isThirdPartyAgency = user?.role === "third_party" && !!user?.agencyId;
  const agenciesToShow = isThirdPartyAgency && user?.agencyId
    ? agencies.filter((a) => a.id === user.agencyId)
    : agencies;

  useEffect(() => {
    if (agencies.length === 1) setAgencyId(agencies[0]!.id);
  }, [agencies]);
  useEffect(() => {
    if (isThirdPartyAgency && user?.agencyId && agencies.some((a) => a.id === user.agencyId)) {
      setAgencyId(user.agencyId);
    }
  }, [isThirdPartyAgency, user?.agencyId, agencies]);

  useEffect(() => {
    if (selectedOrgsRules && centers.length >= 1) {
      setFoodBankCenterId(centers[0]!.id);
    }
  }, [selectedOrgsRules, centers]);

  const [datesInitialized, setDatesInitialized] = useState(false);
  useEffect(() => {
    if (datesInitialized) return;
    const today = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setExpiryDate(d.toISOString().slice(0, 10));
    setIssueDate(today);
    setDatesInitialized(true);
  }, [datesInitialized]);

  async function handleClientSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    const { surname, postcode, noFixedAddress } = clientSearch;
    if (!surname.trim()) {
      setSearchError("Surname is required.");
      return;
    }
    if (!noFixedAddress && !postcode.trim()) {
      setSearchError("Either postcode or No fixed address is required.");
      return;
    }
    setSearchLoading(true);
    try {
      const data = await api.clients.search({
        firstName: clientSearch.firstName.trim() || undefined,
        surname: surname.trim(),
        postcode: postcode.trim() || undefined,
        noFixedAddress: noFixedAddress || undefined,
      });
      setSearchResults(data);
    } catch (err) {
      setSearchError(getErrorMessage(err));
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }

  async function selectClient(row: ClientSearchResult) {
    const c = await api.clients.get(row.id);
    await loadClientForIssue(c, row.vouchersInLast6Months);
    setSearchResults(null);
    setStep(2);
  }

  function requiresMoreThan3Reason(): boolean {
    return vouchersInLast6Months >= 3;
  }

  function canProceedFromStep(s: number): boolean {
    if (s === 2) return !!selectedClient;
    if (s === 3) {
      const notesOk = referral.notes.length <= NOTES_MAX;
      const consentOk = selectedOrgsRules ? true : referral.contactConsent && referral.dietaryConsent;
      return (
        notesOk &&
        consentOk &&
        (!requiresMoreThan3Reason() || hasMoreThan3VouchersReason(referral.moreThan3VouchersReason))
      );
    }
    if (s === 4) return !!agencyId && !!issueDate && (selectedOrgsRules || !!expiryDate);
    if (s === 5) return !!foodBankCenterId;
    return true;
  }

  function goToConfirmStep() {
    setSubmitError(null);
    if (requiresMoreThan3Reason() && !hasMoreThan3VouchersReason(referral.moreThan3VouchersReason)) {
      setSubmitError(
        "This client needs a reason for another voucher (3 or more in the last 6 months). Please complete the section below or go back to Step 3."
      );
      setStep(6);
      return;
    }
    setStep(6);
  }

  async function handleAddAgency(e: React.FormEvent) {
    e.preventDefault();
    setAddAgencyError(null);
    const name = addAgencyName.trim();
    if (!name) {
      setAddAgencyError("Agency name is required.");
      return;
    }
    setAddAgencyLoading(true);
    try {
      const agency = await api.agencies.create({
        name,
        contactPhone: addAgencyPhone.trim() || undefined,
        contactEmail: addAgencyEmail.trim() || undefined,
      });
      const list = await api.agencies.list();
      setAgencies(list);
      setAgencyId(agency.id);
      setAddAgencyDialogOpen(false);
      setAddAgencyName("");
      setAddAgencyPhone("");
      setAddAgencyEmail("");
    } catch (err) {
      setAddAgencyError(getErrorMessage(err));
    } finally {
      setAddAgencyLoading(false);
    }
  }

  async function handleAddCenter(values: {
    name: string;
    address: string;
    postcode: string;
    phone: string;
    email: string;
    canDeliver: boolean;
    openingHours: Record<string, string>;
  }) {
    setAddCenterError(null);
    setAddCenterLoading(true);
    try {
      const openingHours =
        values.openingHours && Object.keys(values.openingHours).length > 0 ? values.openingHours : undefined;
      const center = await api.centers.create({
        name: values.name,
        address: values.address || undefined,
        postcode: values.postcode || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        openingHours: openingHours ?? undefined,
        canDeliver: values.canDeliver,
      });
      const list = await api.centers.list();
      setCenters(list);
      setFoodBankCenterId(center.id);
      setAddCenterDialogOpen(false);
    } catch (err) {
      setAddCenterError(getErrorMessage(err));
    } finally {
      setAddCenterLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedClient || !agencyId) return;
    setSubmitError(null);
    setSubmitLoading(true);
    const issueDateIso = new Date(issueDate).toISOString().slice(0, 10);
    const expiryForPayload = selectedOrgsRules
      ? (() => {
          const d = new Date(issueDate);
          d.setDate(d.getDate() + 7);
          return d.toISOString().slice(0, 10);
        })()
      : new Date(expiryDate).toISOString().slice(0, 10);
    const incomeForPayload = selectedOrgsRules
      ? (referral.incomeSource?.trim() === "" || !referral.incomeSource ? NA_LABEL : referral.incomeSource)
      : referral.incomeSource;
    const dietaryForPayload = selectedOrgsRules
      ? (referral.dietaryRequirements?.trim() === "" || !referral.dietaryRequirements ? NA_LABEL : referral.dietaryRequirements)
      : referral.dietaryRequirements;
    try {
      const v = await api.vouchers.create({
        clientId: selectedClient.id,
        agencyId,
        referralDetails: {
          ...referral,
          notes: referral.notes.slice(0, NOTES_MAX),
          parcelNotes: referral.parcelNotes?.slice(0, PARCEL_NOTES_MAX),
          incomeSource: incomeForPayload,
          dietaryRequirements: dietaryForPayload,
          moreThan3VouchersReason: referral.moreThan3VouchersReason,
        },
        issueDate: issueDateIso,
        expiryDate: expiryForPayload,
        foodBankCenterId: foodBankCenterId || undefined,
        collectionNotes: selectedOrgsRules ? undefined : (collectionNotes.trim() || undefined),
        weightKg: (() => {
          const n = weightKg.trim() ? parseFloat(weightKg) : NaN;
          return typeof n === "number" && !Number.isNaN(n) && n >= 0 ? n : undefined;
        })(),
      });
      setCreatedVoucherId(v.id);
      setCreatedCode(v.code);
      setStep(6);
    } catch (err) {
      const msg = getErrorMessage(err);
      setSubmitError(msg);
      if (msg.includes(MORE_THAN_3_VOUCHERS_ERROR) && selectedClient) {
        api.clients
          .get(selectedClient.id)
          .then((c) => setVouchersInLast6Months(c.vouchersInLast6Months ?? 3))
          .catch(() => setVouchersInLast6Months((n) => Math.max(n, 3)));
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Issue voucher</h1>
      <p className="text-sm text-muted-foreground">
        Step {step} of {STEPS}
      </p>

      {/* Step 1: Client search */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Select client</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search for the client to issue a voucher to.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleClientSearch} className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={clientSearch.firstName}
                  onChange={(e) =>
                    setClientSearch((s) => ({ ...s, firstName: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Surname *</Label>
                <Input
                  value={clientSearch.surname}
                  onChange={(e) =>
                    setClientSearch((s) => ({ ...s, surname: e.target.value }))
                  }
                  placeholder="Required"
                />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={clientSearch.postcode}
                  placeholder="e.g. NE6 3XH"
                  onChange={(e) =>
                    setClientSearch((s) => ({ ...s, postcode: e.target.value }))
                  }
                  disabled={clientSearch.noFixedAddress}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noFixed"
                  checked={clientSearch.noFixedAddress}
                  onChange={(e) =>
                    setClientSearch((s) => ({
                      ...s,
                      noFixedAddress: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="noFixed">No fixed address</Label>
              </div>
              <Button type="submit" disabled={searchLoading}>
                {searchLoading ? "Searching…" : "Search"}
              </Button>
            </form>
            {searchError && (
              <p className="text-sm text-destructive">{searchError}</p>
            )}
            {searchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Results</p>
                <ul className="divide-y rounded-md border">
                  {searchResults.map((row) => (
                    <li key={row.id} className="flex items-center justify-between px-3 py-2">
                      <span>
                        {row.firstName} {row.surname}
                        {row.noFixedAddress ? " (No fixed address)" : ` — ${row.postcode}`}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => selectClient(row)}
                      >
                        Select
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : searchResults && searchResults.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No results found.{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-blue-500 underline"
                    onClick={() => setCreateClientDialogOpen(true)}
                  >
                    Create new client
                  </Button>
                </p>
              </div>
            ) : null  }
          </CardContent>
        </Card>
      )}

      <Dialog open={createClientDialogOpen} onOpenChange={setCreateClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new client</DialogTitle>
            <DialogDescription>
              Add a client then they will be selected for this voucher.
            </DialogDescription>
          </DialogHeader>
          <CreateClientForm
            onSuccess={async (client) => {
              const full = await api.clients.get(client.id);
              await loadClientForIssue(full, 0);
              setStep(2);
              setCreateClientDialogOpen(false);
            }}
            onCancel={() => setCreateClientDialogOpen(false)}
            submitLabel="Create and select"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update client details</DialogTitle>
            <DialogDescription>
              Edit the client’s details. Changes are saved when you click Save changes.
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <CreateClientForm
              client={selectedClient}
              onSuccess={async (client) => {
                const full = await api.clients.get(client.id);
                await loadClientForIssue(full, full.vouchersInLast6Months);
                setEditClientDialogOpen(false);
              }}
              onCancel={() => setEditClientDialogOpen(false)}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addAgencyDialogOpen} onOpenChange={setAddAgencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add agency</DialogTitle>
            <DialogDescription>
              Create a new referral agency. It will be selected for this voucher.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAgency} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-agency-name">Name *</Label>
              <Input
                id="add-agency-name"
                value={addAgencyName}
                onChange={(e) => setAddAgencyName(e.target.value)}
                placeholder="e.g. Citizens Advice North"
                required
                disabled={addAgencyLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-agency-phone">Contact phone</Label>
              <Input
                id="add-agency-phone"
                type="tel"
                value={addAgencyPhone}
                onChange={(e) => setAddAgencyPhone(e.target.value)}
                placeholder="Optional"
                disabled={addAgencyLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-agency-email">Contact email</Label>
              <Input
                id="add-agency-email"
                type="email"
                value={addAgencyEmail}
                onChange={(e) => setAddAgencyEmail(e.target.value)}
                placeholder="Optional"
                disabled={addAgencyLoading}
              />
            </div>
            {addAgencyError && (
              <p className="text-sm text-destructive" role="alert">{addAgencyError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={addAgencyLoading}>
                {addAgencyLoading ? "Creating…" : "Create agency"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddAgencyDialogOpen(false);
                  setAddAgencyError(null);
                  setAddAgencyName("");
                  setAddAgencyPhone("");
                  setAddAgencyEmail("");
                }}
                disabled={addAgencyLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addCenterDialogOpen}
        onOpenChange={(open) => {
          setAddCenterDialogOpen(open);
          if (!open) setAddCenterError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add centre</DialogTitle>
            <DialogDescription>
              Create a new food bank centre. It will be selected for this voucher.
            </DialogDescription>
          </DialogHeader>
          <CenterForm
            onSubmit={handleAddCenter}
            onCancel={() => {
              setAddCenterDialogOpen(false);
              setAddCenterError(null);
            }}
            submitLabel="Create centre"
            loading={addCenterLoading}
            error={addCenterError}
            idPrefix="add-center"
          />
        </DialogContent>
      </Dialog>

      {/* Step 2: Client details */}
      {step === 2 && selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Verify client details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>{selectedClient.firstName} {selectedClient.surname}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedClient.noFixedAddress
                ? "No fixed address"
                : selectedClient.postcode ?? "—"}
              {selectedClient.address && ` · ${selectedClient.address}`}
            </p>
            {vouchersInLast6Months >= 3 && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                This client has {vouchersInLast6Months} vouchers in the last 6 months. You
                will need to provide a reason on the next step before issuing another voucher.
              </p>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setEditClientDialogOpen(true)}
            >
              Update client details
            </Button>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setStep(1)} variant="outline">
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Reason for referral */}
      {step === 3 && (() => {
        const dietaryParsed = parseMultiSelectWithOther(
          referral.dietaryRequirements,
          [...DIETARY_OPTIONS],
          DIETARY_OTHER_LABEL
        );
        const incomeSource = referral.incomeSource ?? (selectedOrgsRules ? NA_LABEL : "");
        const isIncomeOther =
          incomeSource === INCOME_SOURCE_OTHER_LABEL ||
          incomeSource.startsWith(INCOME_SOURCE_OTHER_LABEL + ":") ||
          (incomeSource.length > 0 && !(INCOME_SOURCE_OPTIONS as readonly string[]).includes(incomeSource));
        const incomeOtherText = incomeSource.startsWith(INCOME_SOURCE_OTHER_LABEL + ":")
          ? incomeSource.slice((INCOME_SOURCE_OTHER_LABEL + ":").length).trim()
          : incomeSource && !(INCOME_SOURCE_OPTIONS as readonly string[]).includes(incomeSource)
            ? incomeSource
            : "";

        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3 — Reason for referral</CardTitle>
              <p className="text-sm text-muted-foreground">
                Please provide any additional information that may be relevant to the food bank when providing support.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Source of income in the household (optional)</Label>
                <div className="space-y-2">
                  {selectedOrgsRules && (
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="incomeSource"
                        id="income-NA"
                        checked={(incomeSource === "" || incomeSource === NA_LABEL || !incomeSource)}
                        onChange={() =>
                          setReferral((r) => ({ ...r, incomeSource: NA_LABEL }))
                        }
                        className="h-4 w-4 rounded-full border-input"
                      />
                      <Label htmlFor="income-NA" className="font-normal cursor-pointer">{NA_LABEL}</Label>
                    </div>
                  )}
                  {INCOME_SOURCE_OPTIONS.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="incomeSource"
                        id={`income-${opt.replace(/\s/g, "-")}`}
                        checked={incomeSource === opt}
                        onChange={() =>
                          setReferral((r) => ({
                            ...r,
                            incomeSource: opt,
                          }))
                        }
                        className="h-4 w-4 rounded-full border-input"
                      />
                      <Label htmlFor={`income-${opt.replace(/\s/g, "-")}`} className="font-normal cursor-pointer">
                        {opt}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="incomeSource"
                      id="income-Other"
                      checked={isIncomeOther}
                      onChange={() =>
                        setReferral((r) => ({
                          ...r,
                          incomeSource: incomeOtherText
                            ? INCOME_SOURCE_OTHER_LABEL + ": " + incomeOtherText
                            : INCOME_SOURCE_OTHER_LABEL + ":",
                        }))
                      }
                      className="h-4 w-4 rounded-full border-input"
                    />
                    <Label htmlFor="income-Other" className="font-normal cursor-pointer">
                      {INCOME_SOURCE_OTHER_LABEL}
                    </Label>
                  </div>
                  {(isIncomeOther || incomeOtherText) && (
                    <Input
                      className="ml-6 max-w-md"
                      placeholder="Specify other income source"
                      value={incomeOtherText}
                      onChange={(e) =>
                        setReferral((r) => ({
                          ...r,
                          incomeSource: INCOME_SOURCE_OTHER_LABEL + ": " + e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              </div>

              <MoreThan3VouchersReasonFields
                value={referral.moreThan3VouchersReason}
                onChange={(value) =>
                  setReferral((r) => ({ ...r, moreThan3VouchersReason: value }))
                }
                vouchersInLast6Months={vouchersInLast6Months}
              />

              <div className="space-y-2">
                <Label>Dietary requirements (optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Select all that apply. If the person has any dietary requirements (e.g. allergies or restrictions), add details.
                </p>
                <div className="space-y-2 rounded-md border border-input p-3">
                  {DIETARY_OPTIONS.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`dietary-${opt.replace(/\s/g, "-")}`}
                        checked={dietaryParsed.selected.has(opt)}
                        onChange={(e) => {
                          const newSelected = new Set(dietaryParsed.selected);
                          if (e.target.checked) newSelected.add(opt);
                          else newSelected.delete(opt);
                          setReferral((r) => ({
                            ...r,
                            dietaryRequirements: buildMultiSelectWithOther(
                              newSelected,
                              dietaryParsed.otherText,
                              DIETARY_OTHER_LABEL
                            ),
                          }));
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor={`dietary-${opt.replace(/\s/g, "-")}`} className="font-normal cursor-pointer">
                        {opt}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="dietary-Other"
                      checked={dietaryParsed.selected.has(DIETARY_OTHER_LABEL)}
                      onChange={(e) => {
                        const newSelected = new Set(dietaryParsed.selected);
                        if (e.target.checked) newSelected.add(DIETARY_OTHER_LABEL);
                        else newSelected.delete(DIETARY_OTHER_LABEL);
                        setReferral((r) => ({
                          ...r,
                          dietaryRequirements: buildMultiSelectWithOther(
                            newSelected,
                            dietaryParsed.otherText,
                            DIETARY_OTHER_LABEL
                          ),
                        }));
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="dietary-Other" className="font-normal cursor-pointer">
                      {DIETARY_OTHER_LABEL}
                    </Label>
                  </div>
                  {dietaryParsed.selected.has(DIETARY_OTHER_LABEL) && (
                    <div className="ml-6">
                      <Input
                        placeholder="Specify other dietary requirements"
                        value={dietaryParsed.otherText}
                        onChange={(e) => {
                          setReferral((r) => ({
                            ...r,
                            dietaryRequirements: buildMultiSelectWithOther(
                              dietaryParsed.selected,
                              e.target.value,
                              DIETARY_OTHER_LABEL
                            ),
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of people the voucher is for (by age group)</Label>
                <p className="text-sm text-muted-foreground">
                  Enter the number of people in each age group that this voucher will support.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {HOUSEHOLD_AGE_BANDS.map((band) => {
                    const current = referral.householdByAge != null && typeof referral.householdByAge === "object"
                      ? (referral.householdByAge as Record<string, number>)[band]
                      : undefined;
                    const num = current != null && typeof current === "number" ? current : 0;
                    return (
                      <div key={band} className="flex items-center gap-2">
                        <Label htmlFor={`household-${band}`} className="shrink-0 text-sm">{band}yrs</Label>
                        <Input
                          id={`household-${band}`}
                          type="number"
                          min={0}
                          max={99}
                          value={num}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            const n = Number.isNaN(v) ? 0 : Math.max(0, Math.min(99, v));
                            const prev = (referral.householdByAge != null && typeof referral.householdByAge === "object")
                              ? { ...(referral.householdByAge as Record<string, number>) }
                              : {};
                            setReferral((r) => ({
                              ...r,
                              householdByAge: { ...prev, [band]: n },
                            }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contactConsent"
                  checked={referral.contactConsent}
                  onChange={(e) =>
                    setReferral((r) => ({ ...r, contactConsent: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="contactConsent" className="cursor-pointer">Contact consent{selectedOrgsRules ? "" : " *"}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dietaryConsent"
                  checked={referral.dietaryConsent}
                  onChange={(e) =>
                    setReferral((r) => ({ ...r, dietaryConsent: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="dietaryConsent" className="cursor-pointer">Dietary consent{selectedOrgsRules ? "" : " *"}</Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setStep(2)} variant="outline">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!canProceedFromStep(3)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Step 4: Voucher info */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Voucher details</CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Issue date *</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              {!selectedOrgsRules && (
                <div className="space-y-2">
                  <Label>Expiry date *</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Referral agency *</Label>
              <div className="flex gap-2">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                  disabled={isThirdPartyAgency}
                >
                  <option value="">Select agency</option>
                  {agenciesToShow.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {canManageAgenciesAndCenters && !isThirdPartyAgency && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddAgencyDialogOpen(true)}
                  >
                    Add agency
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ethnic group (optional)</Label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={referral.ethnicGroup ?? ""}
                onChange={(e) =>
                  setReferral((r) => ({ ...r, ethnicGroup: e.target.value }))
                }
              >
                <option value="">Select ethnic group</option>
                {ETHNIC_GROUP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Parcel notes (optional, max {PARCEL_NOTES_MAX})</Label>
              <Input
                value={referral.parcelNotes ?? ""}
                onChange={(e) =>
                  setReferral((r) => ({ ...r, parcelNotes: e.target.value }))
                }
                maxLength={PARCEL_NOTES_MAX}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setStep(3)} variant="outline">
                Back
              </Button>
              <Button
                onClick={() => setStep(5)}
                disabled={!canProceedFromStep(4)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Food bank centre */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Food bank centre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Centre *</Label>
              <div className="flex gap-2">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={foodBankCenterId}
                  onChange={(e) => setFoodBankCenterId(e.target.value)}
                  disabled={selectedOrgsRules && centers.length === 1}
                >
                  <option value="">Select centre</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.address && ` — ${c.address}`}
                    </option>
                  ))}
                </select>
                {canManageAgenciesAndCenters && !selectedOrgsRules && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddCenterDialogOpen(true)}
                  >
                    Add centre
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weight (kg) — optional</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g. 12.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            {/* {!selectedOrgsRules && ( */}
              <div className="space-y-2">
                <Label>Collection notes (optional)</Label>
                <Input
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                />
              </div>
            {/* )} */}
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setStep(4)} variant="outline">
                Back
              </Button>
              <Button
                onClick={goToConfirmStep}
                disabled={!canProceedFromStep(5)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Confirmation & submit or success */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {createdVoucherId ? "Voucher created" : "Step 6 — Confirm and issue"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {createdVoucherId && createdCode ? (
              <>
                <p className="text-lg font-medium">
                  Voucher code: <span className="font-mono">{createdCode}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Expiry: {selectedOrgsRules ? (() => { const d = new Date(issueDate); d.setDate(d.getDate() + 7); return formatDate(d.toISOString().slice(0, 10)); })() : formatDate(expiryDate)}
                </p>
                <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  <p><span className="font-medium text-muted-foreground">Client:</span> {selectedClient?.firstName} {selectedClient?.surname}</p>
                  <p><span className="font-medium text-muted-foreground">Agency:</span> {agencies.find((a) => a.id === agencyId)?.name}</p>
                  <p><span className="font-medium text-muted-foreground">Centre:</span> {centers.find((c) => c.id === foodBankCenterId)?.name}</p>
                  {weightKg.trim() && !Number.isNaN(parseFloat(weightKg)) && (
                    <p><span className="font-medium text-muted-foreground">Weight (kg):</span> {weightKg}</p>
                  )}
                  {referral.notes && <p><span className="font-medium text-muted-foreground">Notes:</span> {referral.notes}</p>}
                  {referral.incomeSource && <p><span className="font-medium text-muted-foreground">Income source:</span> {referral.incomeSource}</p>}
                  {referral.dietaryRequirements && <p><span className="font-medium text-muted-foreground">Dietary:</span> {referral.dietaryRequirements}</p>}
                </div>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link href={`/dashboard/vouchers/${createdVoucherId}?print=1`}>
                      View and print voucher
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/vouchers/issue">Issue another</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 text-sm">
                  <section className="rounded-md border bg-muted/30 p-3 space-y-1">
                    <p className="font-medium text-muted-foreground mb-1">Voucher</p>
                    <p><span className="font-medium text-muted-foreground">Client:</span> {selectedClient?.firstName} {selectedClient?.surname}</p>
                    <p><span className="font-medium text-muted-foreground">Agency:</span> {agencies.find((a) => a.id === agencyId)?.name}</p>
                    <p><span className="font-medium text-muted-foreground">Centre:</span> {centers.find((c) => c.id === foodBankCenterId)?.name}</p>
                    <p><span className="font-medium text-muted-foreground">Issue:</span> {formatDate(issueDate)} — <span className="font-medium text-muted-foreground">Expiry:</span> {selectedOrgsRules ? (() => { const d = new Date(issueDate); d.setDate(d.getDate() + 7); return formatDate(d.toISOString().slice(0, 10)); })() : formatDate(expiryDate)}
                    </p>
                    {weightKg.trim() && !Number.isNaN(parseFloat(weightKg)) && (
                      <p><span className="font-medium text-muted-foreground">Weight (kg):</span> {weightKg}</p>
                    )}
                  </section>
                  <section className="rounded-md border bg-muted/30 p-3 space-y-1">
                    <p className="font-medium text-muted-foreground mb-1">Referral details</p>
                    {!selectedOrgsRules && <p><span className="font-medium text-muted-foreground">Notes:</span> {referral.notes || "—"}</p>}
                    {referral.incomeSource && <p><span className="font-medium text-muted-foreground">Income source:</span> {referral.incomeSource}</p>}
                    {vouchersInLast6Months >= 3 && referral.moreThan3VouchersReason && (
                      <p><span className="font-medium text-muted-foreground">Reason for 3+ vouchers:</span> {referral.moreThan3VouchersReason}</p>
                    )}
                    {referral.dietaryRequirements && <p><span className="font-medium text-muted-foreground">Dietary:</span> {referral.dietaryRequirements}</p>}
                    {referral.ethnicGroup && <p><span className="font-medium text-muted-foreground">Ethnic group:</span> {referral.ethnicGroup}</p>}
                    {referral.parcelNotes && <p><span className="font-medium text-muted-foreground">Parcel notes:</span> {referral.parcelNotes}</p>}
                    <p><span className="font-medium text-muted-foreground">Contact consent:</span> {referral.contactConsent ? "Yes" : "No"}</p>
                    <p><span className="font-medium text-muted-foreground">Dietary consent:</span> {referral.dietaryConsent ? "Yes" : "No"}</p>
                  </section>
                </div>
                <MoreThan3VouchersReasonFields
                  value={referral.moreThan3VouchersReason}
                  onChange={(value) => {
                    setSubmitError(null);
                    setReferral((r) => ({ ...r, moreThan3VouchersReason: value }));
                  }}
                  vouchersInLast6Months={vouchersInLast6Months}
                />
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setStep(5)} variant="outline">
                    Back
                  </Button>
                  {requiresMoreThan3Reason() &&
                    !hasMoreThan3VouchersReason(referral.moreThan3VouchersReason) && (
                      <Button onClick={() => setStep(3)} variant="outline">
                        Edit referral (step 3)
                      </Button>
                    )}
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      submitLoading ||
                      (requiresMoreThan3Reason() &&
                        !hasMoreThan3VouchersReason(referral.moreThan3VouchersReason))
                    }
                  >
                    {submitLoading ? "Creating…" : "Create voucher"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
