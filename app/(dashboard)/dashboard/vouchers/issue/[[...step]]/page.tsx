"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
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

const STEPS = 6;
const NOTES_MAX = 400;
const PARCEL_NOTES_MAX = 400;

/** Reason for needing more than 3 vouchers in 6 months — multi-select options (from reference). */
const MORE_THAN_3_REASON_OPTIONS = [
  "Awaiting first benefit payment",
  "Benefit delay or sanction",
  "Debt",
  "Domestic abuse",
  "Drug or alcohol dependency",
  "Homelessness",
  "Long term health condition",
  "Long term unemployment",
  "No access to financial support due to immigration status",
  "Other - low income",
] as const;
const MORE_THAN_3_OTHER_LABEL = "Other";

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

/** Ethnic group — single-select options (UK ONS-style categories). */
const ETHNIC_GROUP_OPTIONS = [
  "White: English, Welsh, Scottish, Northern Irish or British",
  "White: Irish",
  "White: Gypsy or Irish Traveller",
  "White: Roma",
  "White: Other",
  "Mixed or Multiple: White and Black Caribbean",
  "Mixed or Multiple: White and Black African",
  "Mixed or Multiple: White and Asian",
  "Mixed or Multiple: Other",
  "Asian or Asian British: Indian",
  "Asian or Asian British: Pakistani",
  "Asian or Asian British: Bangladeshi",
  "Asian or Asian British: Chinese",
  "Asian or Asian British: Other",
  "Black, Black British, Caribbean or African: African",
  "Black, Black British, Caribbean or African: Caribbean",
  "Black, Black British, Caribbean or African: Other",
  "Other: Arab",
  "Other: Any other ethnic group",
  "Prefer not to say",
] as const;

function parseMultiSelectWithOther(
  value: string | undefined,
  options: readonly string[],
  otherLabel: string
): { selected: Set<string>; otherText: string } {
  const selected = new Set<string>();
  let otherText = "";
  const str = (value ?? "").trim();
  if (!str) return { selected, otherText };
  const parts = str.split(/\s*,\s*/);
  for (const p of parts) {
    if (p === otherLabel) {
      selected.add(otherLabel);
    } else if (p.startsWith(otherLabel + ":")) {
      selected.add(otherLabel);
      otherText = p.slice((otherLabel + ":").length).trim();
    } else if (options.includes(p)) {
      selected.add(p);
    }
  }
  return { selected, otherText };
}

function buildMultiSelectWithOther(
  selected: Set<string>,
  otherText: string,
  otherLabel: string
): string {
  const list = [...selected].filter((x) => x !== otherLabel);
  if (selected.has(otherLabel) && otherText.trim()) {
    list.push(`${otherLabel}: ${otherText.trim()}`);
  } else if (selected.has(otherLabel)) {
    list.push(otherLabel);
  }
  return list.join(", ");
}

export default function IssueVoucherWizardPage() {
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId");
  const { hasPermission } = useRbac();
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
  });
  const [agencyId, setAgencyId] = useState("");
  const [foodBankCenterId, setFoodBankCenterId] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
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
  const [addCenterName, setAddCenterName] = useState("");
  const [addCenterAddress, setAddCenterAddress] = useState("");
  const [addCenterPostcode, setAddCenterPostcode] = useState("");
  const [addCenterPhone, setAddCenterPhone] = useState("");
  const [addCenterEmail, setAddCenterEmail] = useState("");
  const [addCenterCanDeliver, setAddCenterCanDeliver] = useState(false);
  const [addCenterLoading, setAddCenterLoading] = useState(false);
  const [addCenterError, setAddCenterError] = useState<string | null>(null);

  useEffect(() => {
    if (clientIdParam && !selectedClient) {
      api.clients
        .get(clientIdParam)
        .then((c) => {
          setSelectedClient(c);
          setStep(2);
        })
        .catch(() => {});
    }
  }, [clientIdParam, selectedClient]);

  useEffect(() => {
    api.agencies.list().then(setAgencies).catch(() => {});
    api.centers.list().then(setCenters).catch(() => {});
  }, []);

  useEffect(() => {
    if (agencies.length === 1) setAgencyId(agencies[0]!.id);
  }, [agencies]);

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
    setSelectedClient(c);
    setVouchersInLast6Months(row.vouchersInLast6Months);
    setSearchResults(null);
    setStep(2);
  }

  function canProceedFromStep(s: number): boolean {
    if (s === 2) return !!selectedClient;
    if (s === 3)
      return (
        referral.notes.trim().length > 0 &&
        referral.notes.length <= NOTES_MAX &&
        referral.contactConsent &&
        referral.dietaryConsent &&
        (vouchersInLast6Months < 3 || (referral.moreThan3VouchersReason ?? "").trim().length > 0)
      );
    if (s === 4) return !!agencyId && !!issueDate && !!expiryDate;
    if (s === 5) return !!foodBankCenterId;
    return true;
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

  async function handleAddCenter(e: React.FormEvent) {
    e.preventDefault();
    setAddCenterError(null);
    const name = addCenterName.trim();
    if (!name) {
      setAddCenterError("Centre name is required.");
      return;
    }
    setAddCenterLoading(true);
    try {
      const center = await api.centers.create({
        name,
        address: addCenterAddress.trim() || undefined,
        postcode: addCenterPostcode.trim() || undefined,
        phone: addCenterPhone.trim() || undefined,
        email: addCenterEmail.trim() || undefined,
        canDeliver: addCenterCanDeliver,
      });
      const list = await api.centers.list();
      setCenters(list);
      setFoodBankCenterId(center.id);
      setAddCenterDialogOpen(false);
      setAddCenterName("");
      setAddCenterAddress("");
      setAddCenterPostcode("");
      setAddCenterPhone("");
      setAddCenterEmail("");
      setAddCenterCanDeliver(false);
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
    try {
      const v = await api.vouchers.create({
        clientId: selectedClient.id,
        agencyId,
        referralDetails: {
          ...referral,
          notes: referral.notes.slice(0, NOTES_MAX),
          parcelNotes: referral.parcelNotes?.slice(0, PARCEL_NOTES_MAX),
        },
        issueDate: new Date(issueDate).toISOString().slice(0, 10),
        expiryDate: new Date(expiryDate).toISOString().slice(0, 10),
        foodBankCenterId: foodBankCenterId || undefined,
        collectionNotes: collectionNotes.trim() || undefined,
      });
      setCreatedVoucherId(v.id);
      setCreatedCode(v.code);
      setStep(6);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
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
              setSelectedClient(full);
              setVouchersInLast6Months(0);
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
                setSelectedClient(full);
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

      <Dialog open={addCenterDialogOpen} onOpenChange={setAddCenterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add centre</DialogTitle>
            <DialogDescription>
              Create a new food bank centre. It will be selected for this voucher.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCenter} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-center-name">Name *</Label>
              <Input
                id="add-center-name"
                value={addCenterName}
                onChange={(e) => setAddCenterName(e.target.value)}
                placeholder="e.g. North East Food Bank"
                required
                disabled={addCenterLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-center-address">Address</Label>
              <Input
                id="add-center-address"
                value={addCenterAddress}
                onChange={(e) => setAddCenterAddress(e.target.value)}
                placeholder="Optional"
                disabled={addCenterLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-center-postcode">Postcode</Label>
              <Input
                id="add-center-postcode"
                value={addCenterPostcode}
                onChange={(e) => setAddCenterPostcode(e.target.value)}
                placeholder="Optional"
                disabled={addCenterLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-center-phone">Phone</Label>
              <Input
                id="add-center-phone"
                type="tel"
                value={addCenterPhone}
                onChange={(e) => setAddCenterPhone(e.target.value)}
                placeholder="Optional"
                disabled={addCenterLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-center-email">Email</Label>
              <Input
                id="add-center-email"
                type="email"
                value={addCenterEmail}
                onChange={(e) => setAddCenterEmail(e.target.value)}
                placeholder="Optional"
                disabled={addCenterLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="add-center-canDeliver"
                checked={addCenterCanDeliver}
                onChange={(e) => setAddCenterCanDeliver(e.target.checked)}
                className="h-4 w-4 rounded border-input"
                disabled={addCenterLoading}
              />
              <Label htmlFor="add-center-canDeliver" className="cursor-pointer">
                Can deliver
              </Label>
            </div>
            {addCenterError && (
              <p className="text-sm text-destructive" role="alert">{addCenterError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={addCenterLoading}>
                {addCenterLoading ? "Creating…" : "Create centre"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddCenterDialogOpen(false);
                  setAddCenterError(null);
                  setAddCenterName("");
                  setAddCenterAddress("");
                  setAddCenterPostcode("");
                  setAddCenterPhone("");
                  setAddCenterEmail("");
                  setAddCenterCanDeliver(false);
                }}
                disabled={addCenterLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
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
        const moreThan3Parsed = parseMultiSelectWithOther(
          referral.moreThan3VouchersReason,
          [...MORE_THAN_3_REASON_OPTIONS],
          MORE_THAN_3_OTHER_LABEL
        );
        const dietaryParsed = parseMultiSelectWithOther(
          referral.dietaryRequirements,
          [...DIETARY_OPTIONS],
          DIETARY_OTHER_LABEL
        );
        const incomeSource = referral.incomeSource ?? "";
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
                <Label>Notes (max {NOTES_MAX} characters) *</Label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={referral.notes}
                  onChange={(e) =>
                    setReferral((r) => ({ ...r, notes: e.target.value }))
                  }
                  maxLength={NOTES_MAX}
                  placeholder="Please enter any additional information that may be relevant to the food bank when providing support."
                />
                <p className="text-xs text-muted-foreground">
                  {referral.notes.length} / {NOTES_MAX}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Source of income in the household (optional)</Label>
                <div className="space-y-2">
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

              {vouchersInLast6Months >= 3 && (
                <div className="space-y-2">
                  <Label>Reason for needing more than 3 vouchers in the last 6 months *</Label>
                  <p className="text-sm text-muted-foreground">
                    This client has been issued 3 vouchers in the last 6 months. Please select all that apply.
                  </p>
                  <div className="space-y-2 rounded-md border border-input p-3">
                    {MORE_THAN_3_REASON_OPTIONS.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`more3-${opt.replace(/\s/g, "-")}`}
                          checked={moreThan3Parsed.selected.has(opt)}
                          onChange={(e) => {
                            const newSelected = new Set(moreThan3Parsed.selected);
                            if (e.target.checked) newSelected.add(opt);
                            else newSelected.delete(opt);
                            setReferral((r) => ({
                              ...r,
                              moreThan3VouchersReason: buildMultiSelectWithOther(
                                newSelected,
                                moreThan3Parsed.otherText,
                                MORE_THAN_3_OTHER_LABEL
                              ),
                            }));
                          }}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor={`more3-${opt.replace(/\s/g, "-")}`} className="font-normal cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="more3-Other"
                        checked={moreThan3Parsed.selected.has(MORE_THAN_3_OTHER_LABEL)}
                        onChange={(e) => {
                          const newSelected = new Set(moreThan3Parsed.selected);
                          if (e.target.checked) newSelected.add(MORE_THAN_3_OTHER_LABEL);
                          else newSelected.delete(MORE_THAN_3_OTHER_LABEL);
                          setReferral((r) => ({
                            ...r,
                            moreThan3VouchersReason: buildMultiSelectWithOther(
                              newSelected,
                              moreThan3Parsed.otherText,
                              MORE_THAN_3_OTHER_LABEL
                            ),
                          }));
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="more3-Other" className="font-normal cursor-pointer">
                        {MORE_THAN_3_OTHER_LABEL}
                      </Label>
                    </div>
                    {moreThan3Parsed.selected.has(MORE_THAN_3_OTHER_LABEL) && (
                      <div className="ml-6">
                        <Input
                          placeholder="If you select Other, add details here"
                          value={moreThan3Parsed.otherText}
                          onChange={(e) => {
                            setReferral((r) => ({
                              ...r,
                              moreThan3VouchersReason: buildMultiSelectWithOther(
                                moreThan3Parsed.selected,
                                e.target.value,
                                MORE_THAN_3_OTHER_LABEL
                              ),
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                <Label htmlFor="contactConsent" className="cursor-pointer">Contact consent *</Label>
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
                <Label htmlFor="dietaryConsent" className="cursor-pointer">Dietary consent *</Label>
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
              <div className="space-y-2">
                <Label>Expiry date *</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referral agency *</Label>
              <div className="flex gap-2">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                >
                  <option value="">Select agency</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {canManageAgenciesAndCenters && (
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
                >
                  <option value="">Select centre</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.address && ` — ${c.address}`}
                    </option>
                  ))}
                </select>
                {canManageAgenciesAndCenters && (
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
              <Label>Collection notes (optional)</Label>
              <Input
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setStep(4)} variant="outline">
                Back
              </Button>
              <Button
                onClick={() => setStep(6)}
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
                  Expiry: {formatDate(expiryDate)}
                </p>
                <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  <p><span className="font-medium text-muted-foreground">Client:</span> {selectedClient?.firstName} {selectedClient?.surname}</p>
                  <p><span className="font-medium text-muted-foreground">Agency:</span> {agencies.find((a) => a.id === agencyId)?.name}</p>
                  <p><span className="font-medium text-muted-foreground">Centre:</span> {centers.find((c) => c.id === foodBankCenterId)?.name}</p>
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
                    <p><span className="font-medium text-muted-foreground">Issue:</span> {formatDate(issueDate)} — <span className="font-medium text-muted-foreground">Expiry:</span> {formatDate(expiryDate)}
                    </p>
                  </section>
                  <section className="rounded-md border bg-muted/30 p-3 space-y-1">
                    <p className="font-medium text-muted-foreground mb-1">Referral details</p>
                    <p><span className="font-medium text-muted-foreground">Notes:</span> {referral.notes || "—"}</p>
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
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => setStep(5)} variant="outline">
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitLoading}>
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
