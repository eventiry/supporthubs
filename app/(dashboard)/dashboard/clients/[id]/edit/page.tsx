"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { ClientWithVouchers } from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loading } from "@/components/ui/loading";

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientWithVouchers | null>(null);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [postcode, setPostcode] = useState("");
  const [noFixedAddress, setNoFixedAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.clients
      .get(id)
      .then((data) => {
        if (!cancelled) {
          setClient(data);
          setFirstName(data.firstName);
          setSurname(data.surname);
          setPostcode(data.postcode ?? "");
          setNoFixedAddress(data.noFixedAddress);
          setAddress(data.address ?? "");
          setYearOfBirth(
            data.yearOfBirth != null ? String(data.yearOfBirth) : ""
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setSubmitError(null);
    const trimmedFirst = firstName.trim();
    const trimmedSurname = surname.trim();
    if (!trimmedFirst || !trimmedSurname) {
      setSubmitError("First name and surname are required.");
      return;
    }
    if (!noFixedAddress && !postcode.trim()) {
      setSubmitError("Either enter a postcode or tick “No fixed address”.");
      return;
    }
    setLoading(true);
    try {
      await api.clients.update(client.id, {
        firstName: trimmedFirst,
        surname: trimmedSurname,
        postcode: postcode.trim() || undefined,
        noFixedAddress: noFixedAddress || undefined,
        address: address.trim() || undefined,
        yearOfBirth: yearOfBirth.trim()
          ? parseInt(yearOfBirth, 10)
          : undefined,
      });
      router.push(`/dashboard/clients/${client.id}`);
      router.refresh();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (loadError && !client) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">
          Update client details
        </h1>
        <p className="text-destructive">{loadError}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/clients">Back to clients</Link>
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">
          Update client details
        </h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">
        Update client details
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Edit client</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update the client’s details below.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname *</Label>
                <Input
                  id="surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="noFixedAddress"
                checked={noFixedAddress}
                onChange={(e) => setNoFixedAddress(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="noFixedAddress" className="cursor-pointer">
                No fixed address
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g. NE6 3XH"
                disabled={noFixedAddress}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address if known"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearOfBirth">Year of birth (optional)</Label>
              <Input
                id="yearOfBirth"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={yearOfBirth}
                onChange={(e) => setYearOfBirth(e.target.value)}
                placeholder="e.g. 1985"
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/clients/${client.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
