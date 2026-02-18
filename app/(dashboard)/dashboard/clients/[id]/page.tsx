"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { ClientWithVouchers } from "@/lib/types";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { Loading } from "@/components/ui/loading";

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientWithVouchers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.clients
      .get(id)
      .then((data) => {
        if (!cancelled) setClient(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Client details</h1>
        <Loading />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Client details</h1>
        <p className="text-destructive">
          {error ?? "Client not found."}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/clients">Back to clients</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">
          {client.firstName} {client.surname}
        </h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              Update client details
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/dashboard/vouchers/issue?clientId=${client.id}`}>
              Issue voucher
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Postcode:</span>{" "}
            {client.noFixedAddress ? "No fixed address" : client.postcode ?? "—"}
          </p>
          {client.address && (
            <p>
              <span className="text-muted-foreground">Address:</span>{" "}
              {client.address}
            </p>
          )}
          {client.yearOfBirth != null && (
            <p>
              <span className="text-muted-foreground">Year of birth:</span>{" "}
              {client.yearOfBirth}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Created:</span>{" "}
            {formatDate(client.createdAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent voucher history</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest vouchers for this client.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {client.vouchers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No vouchers yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Expiry date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.code}</TableCell>
                    <TableCell className="capitalize">{v.status}</TableCell>
                    <TableCell>{formatDate(v.issueDate)}</TableCell>
                    <TableCell>{formatDate(v.expiryDate)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/vouchers/${v.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/dashboard/clients">Back to clients</Link>
      </Button>
    </div>
  );
}
