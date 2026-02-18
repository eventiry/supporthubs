"use client";

import { useRouter } from "next/navigation";
import { CreateClientForm } from "@/components/create-client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";

export default function NewClientPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">
        Create new client
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the client’s details. First name and surname are required.
          </p>
        </CardHeader>
        <CardContent>
          <CreateClientForm
            onSuccess={(client) => {
              router.push(`/dashboard/clients/${client.id}`);
              router.refresh();
            }}
            cancelHref="/dashboard/clients"
            submitLabel="Create client"
          />
        </CardContent>
      </Card>
    </div>
  );
}
