"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { Client } from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { PostcodeLookup } from "@/components/postcode-lookup";

/** Client-like shape for form (create or edit). */
type ClientFormClient = Pick<
  Client,
  "id" | "firstName" | "surname" | "postcode" | "noFixedAddress" | "address" | "yearOfBirth"
>;

export interface CreateClientFormProps {
  /** When set, form is in edit mode: prefilled and submits via PATCH. */
  client?: ClientFormClient | null;
  /** Called after client is created or updated. */
  onSuccess?: (client: Client) => void;
  /** Called when user cancels (e.g. to close dialog). When not set, Cancel renders as Link when cancelHref is set. */
  onCancel?: () => void;
  /** When set, Cancel is a Link to this href. Ignored if onCancel is set. */
  cancelHref?: string;
  /** Submit button label. Defaults to "Save changes" when client is set, else "Create client". */
  submitLabel?: string;
  /** Optional wrapper class (e.g. for dialog padding). */
  className?: string;
}

export function CreateClientForm({
  client: initialClient,
  onSuccess,
  onCancel,
  cancelHref,
  submitLabel,
  className,
}: CreateClientFormProps) {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [postcode, setPostcode] = useState("");
  const [noFixedAddress, setNoFixedAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialClient) {
      setFirstName(initialClient.firstName ?? "");
      setSurname(initialClient.surname ?? "");
      setPostcode(initialClient.postcode ?? "");
      setNoFixedAddress(initialClient.noFixedAddress ?? false);
      setAddress(initialClient.address ?? "");
      setYearOfBirth(
        initialClient.yearOfBirth != null ? String(initialClient.yearOfBirth) : ""
      );
    }
  }, [initialClient]);

  const isEdit = !!initialClient?.id;
  const defaultSubmitLabel = isEdit ? "Save changes" : "Create client";
  const label = submitLabel ?? defaultSubmitLabel;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedFirst = firstName.trim();
    const trimmedSurname = surname.trim();
    if (!trimmedFirst || !trimmedSurname) {
      setError("First name and surname are required.");
      return;
    }
    if (!noFixedAddress && !postcode.trim()) {
      setError("Either enter a postcode or tick “No fixed address”.");
      return;
    }
    const payload = {
      firstName: trimmedFirst,
      surname: trimmedSurname,
      postcode: postcode.trim() || undefined,
      noFixedAddress: noFixedAddress || undefined,
      address: address.trim() || undefined,
      yearOfBirth: yearOfBirth.trim()
        ? parseInt(yearOfBirth, 10)
        : undefined,
    };
    setLoading(true);
    try {
      const client = isEdit
        ? await api.clients.update(initialClient!.id, payload)
        : await api.clients.create(payload);
      onSuccess?.(client);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className ? `space-y-4 ${className}` : "space-y-4"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-client-firstName">First name *</Label>
          <Input
            id="create-client-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-client-surname">Surname *</Label>
          <Input
            id="create-client-surname"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="create-client-noFixedAddress"
          checked={noFixedAddress}
          onChange={(e) => setNoFixedAddress(e.target.checked)}
          className="h-4 w-4 rounded border-input"
          disabled={loading}
        />
        <Label htmlFor="create-client-noFixedAddress" className="cursor-pointer">
          No fixed address
        </Label>
      </div>

      <PostcodeLookup
        id="create-client-postcode"
        label="Postcode"
        value={postcode}
        onChange={setPostcode}
        onAddressSelect={(_pc, addressLine) => setAddress((prev) => addressLine || prev)}
        disabled={noFixedAddress || loading}
        placeholder="e.g. NE6 3XH"
      />

      <div className="space-y-2">
        <Label htmlFor="create-client-address">Address (optional)</Label>
        <Input
          id="create-client-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address or select from postcode lookup"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-client-yearOfBirth">Year of birth (optional)</Label>
        <Input
          id="create-client-yearOfBirth"
          type="number"
          min={1900}
          max={new Date().getFullYear()}
          value={yearOfBirth}
          onChange={(e) => setYearOfBirth(e.target.value)}
          placeholder="e.g. 1985"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? (isEdit ? "Saving…" : "Creating…") : label}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        ) : cancelHref ? (
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
