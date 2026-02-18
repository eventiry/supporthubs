"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { ClientSearchResult } from "@/lib/types";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
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
import { CreateClientForm } from "@/components/create-client-form";
import { Plus } from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [postcode, setPostcode] = useState("");
  const [noFixedAddress, setNoFixedAddress] = useState(false);
  const [results, setResults] = useState<ClientSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedSurname = surname.trim();
    if (!trimmedSurname) {
      setError("Surname is required.");
      return;
    }
    if (!noFixedAddress && !postcode.trim()) {
      setError("Either enter a postcode or tick “No fixed address”.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.clients.search({
        firstName: firstName.trim() || undefined,
        surname: trimmedSurname,
        postcode: postcode.trim() || undefined,
        noFixedAddress: noFixedAddress || undefined,
      });
      setResults(data);
    } catch (err) {
      setError(getErrorMessage(err));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-lg font-semibold text-foreground sm:text-xl">Clients</h1>

      <Card>
        <CardHeader>
          <CardTitle>Search clients</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter surname and either postcode or tick “No fixed address”.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">Surname</Label>
              <Input
                id="surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Required"
                required
              />
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
            <div className="flex items-center gap-2 justify-center">
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
            <Button type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Results</h2>
        <Button
          type="button"
          variant="default"
          onClick={() => setCreateClientDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New client record
        </Button>
      </div>

      <Dialog open={createClientDialogOpen} onOpenChange={setCreateClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New client record</DialogTitle>
            <DialogDescription>
              Enter the client’s details. First name and surname are required.
            </DialogDescription>
          </DialogHeader>
          <CreateClientForm
            onSuccess={(client) => {
              setCreateClientDialogOpen(false);
              router.push(`/dashboard/clients/${client.id}`);
              router.refresh();
            }}
            onCancel={() => setCreateClientDialogOpen(false)}
            submitLabel="Create client"
          />
        </DialogContent>
      </Dialog> 

      {results && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            {results.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No clients found. Try different search criteria or create a new
                client.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Postcode</TableHead>
                    <TableHead>Last voucher issued</TableHead>
                    <TableHead>Last voucher fulfilled</TableHead>
                    <TableHead>Vouchers (6 months)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.firstName} {row.surname}
                      </TableCell>
                      <TableCell>
                        {row.noFixedAddress ? "No fixed address" : row.postcode ?? "—"}
                      </TableCell>
                      <TableCell>
                        {row.lastVoucherIssued
                          ? formatDate(row.lastVoucherIssued)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.lastVoucherFulfilled
                          ? formatDate(row.lastVoucherFulfilled)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            row.vouchersInLast6Months > 3
                              ? "font-medium text-destructive"
                              : undefined
                          }
                        >
                          {row.vouchersInLast6Months}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/dashboard/vouchers/issue?clientId=${row.id}`}
                            >
                              Issue voucher
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/clients/${row.id}`}>
                              Details
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            </div>
          </CardContent>
        </Card>
      )}

      {results === null && !error && (
        <p className="text-sm text-muted-foreground">
          Use the search form above to find clients, or create a new client
          record.
        </p>
      )}
    </div>
  );
}
