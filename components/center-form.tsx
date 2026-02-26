"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Button } from "@/components/button";
import { PostcodeLookup } from "@/components/postcode-lookup";
import type { FoodBankCenter } from "@/lib/types";

const OPENING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface CenterFormValues {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  canDeliver: boolean;
  openingHours: Record<string, string>;
}

const defaultValues: CenterFormValues = {
  name: "",
  address: "",
  postcode: "",
  phone: "",
  email: "",
  canDeliver: false,
  openingHours: {},
};

function parseOpeningHours(value: unknown): Record<string, string> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, string>;
  return OPENING_DAYS.reduce<Record<string, string>>((acc, day) => {
    const v = obj[day];
    if (typeof v === "string" && v.trim()) acc[day] = v.trim();
    return acc;
  }, {});
}

export interface CenterFormProps {
  /** When set, form is in edit mode with prefilled values. */
  center?: (Pick<
    FoodBankCenter,
    "id" | "name" | "address" | "postcode" | "phone" | "email" | "canDeliver"
  > & { openingHours?: unknown }) | null;
  onSubmit: (values: CenterFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  /** Prefix for input ids (e.g. "add-center", "edit-center", "center"). */
  idPrefix?: string;
  /** Optional class for the form container. */
  className?: string;
}

export function CenterForm({
  center,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel = "Cancel",
  loading = false,
  error,
  idPrefix = "center",
  className,
}: CenterFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [canDeliver, setCanDeliver] = useState(false);
  const [openingHours, setOpeningHours] = useState<Record<string, string>>({});

  useEffect(() => {
    if (center) {
      setName(center.name ?? "");
      setAddress(center.address ?? "");
      setPostcode(center.postcode ?? "");
      setPhone(center.phone ?? "");
      setEmail(center.email ?? "");
      setCanDeliver(center.canDeliver ?? false);
      setOpeningHours(
        "openingHours" in center && center.openingHours != null
          ? parseOpeningHours(center.openingHours)
          : {}
      );
    } else {
      setName(defaultValues.name);
      setAddress(defaultValues.address);
      setPostcode(defaultValues.postcode);
      setPhone(defaultValues.phone);
      setEmail(defaultValues.email);
      setCanDeliver(defaultValues.canDeliver);
      setOpeningHours({});
    }
  }, [center]);

  const isEdit = !!center?.id;
  const defaultSubmitLabel = isEdit ? "Save" : "Create centre";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const hoursPayload = Object.fromEntries(
      OPENING_DAYS.filter((day) => openingHours[day]?.trim()).map((day) => [day, openingHours[day]!.trim()])
    );
    await onSubmit({
      name: trimmedName,
      address: address.trim(),
      postcode: postcode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      canDeliver,
      openingHours: hoursPayload,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className ?? "space-y-4"}
    >
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Name *</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. North East Food Bank"
          required
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-address`}>Address</Label>
        <Input
          id={`${idPrefix}-address`}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Optional or select from postcode lookup"
          disabled={loading}
        />
      </div>
      <PostcodeLookup
        id={`${idPrefix}-postcode`}
        label="Postcode"
        value={postcode}
        onChange={setPostcode}
        onAddressSelect={(_pc, addressLine) => setAddress(addressLine)}
        disabled={loading}
        placeholder="e.g. NE6 3XH"
      />
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Optional"
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional"
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label>Opening hours</Label>
        <p className="text-xs text-muted-foreground">
          Optional. e.g. 10:00-11:30 or 10:00-13:00. Leave blank for closed.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {OPENING_DAYS.map((day) => (
            <div key={day} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-sm font-medium text-muted-foreground">{day}</span>
              <Input
                id={`${idPrefix}-hours-${day}`}
                value={openingHours[day] ?? ""}
                onChange={(e) =>
                  setOpeningHours((prev) => ({
                    ...prev,
                    [day]: e.target.value,
                  }))
                }
                placeholder="e.g. 10:00-13:00"
                disabled={loading}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`${idPrefix}-canDeliver`}
          checked={canDeliver}
          onChange={(e) => setCanDeliver(e.target.checked)}
          className="h-4 w-4 rounded border-input"
          disabled={loading}
        />
        <Label htmlFor={`${idPrefix}-canDeliver`} className="cursor-pointer">
          Can deliver
        </Label>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? (isEdit ? "Saving…" : "Creating…") : (submitLabel ?? defaultSubmitLabel)}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}
