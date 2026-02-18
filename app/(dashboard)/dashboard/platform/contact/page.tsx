"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useRbac } from "@/lib/hooks/use-rbac";
import { Permission } from "@/lib/rbac/permissions";
import type { ContactSubmissionListItem, ContactSubmissionDetail } from "@/lib/types";
import { Button } from "@/components/button";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
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
import { Loading } from "@/components/ui/loading";

const MESSAGE_EXCERPT_LEN = 60;
const CUSTOME_MESSAGE = "We received your request to use our platform. We will process this shortly. You will get a feed back from our team once this have been process within 1-2 days";
function excerpt(msg: string): string {
  const t = msg.trim();
  if (t.length <= MESSAGE_EXCERPT_LEN) return t;
  return t.slice(0, MESSAGE_EXCERPT_LEN) + "…";
}

export default function PlatformContactEnquiriesPage() {
  const { hasPermission, isLoading: rbacLoading } = useRbac();
  const canView = hasPermission(Permission.ORGANIZATION_VIEW);

  const [submissions, setSubmissions] = useState<ContactSubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState(CUSTOME_MESSAGE);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySent, setReplySent] = useState(false);

  const fetchList = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    api.platform.contactSubmissions
      .list()
      .then(setSubmissions)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [canView]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setReplyMessage("");
      setReplyError(null);
      setReplySent(false);
      return;
    }
    setDetailLoading(true);
    setReplyError(null);
    api.platform.contactSubmissions
      .get(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !detail) return;
    const msg = replyMessage.trim();
    if (!msg) {
      setReplyError("Please enter a reply message.");
      return;
    }
    setReplyError(null);
    setReplyLoading(true);
    try {
      await api.platform.contactSubmissions.respond(selectedId, { message: msg });
      setReplySent(true);
      setReplyMessage("");
    } catch (err) {
      setReplyError(getErrorMessage(err));
    } finally {
      setReplyLoading(false);
    }
  }

  function closeDialog() {
    setSelectedId(null);
  }

  if (rbacLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Contact enquiries</h1>
        <Loading />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Contact enquiries</h1>
        <p className="text-destructive">You do not have permission to view contact enquiries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Contact enquiries</h1>
      <p className="text-sm text-muted-foreground">
        View and respond to contact form submissions from the public site.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>All submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loading />
          ) : submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contact submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Want to use</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.organizationName ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {excerpt(s.message)}
                    </TableCell>
                    <TableCell>{s.wantToUse ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(s.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedId != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact enquiry</DialogTitle>
            <DialogDescription>
              View details and send a reply by email to the enquirer.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <Loading />
          ) : detail ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Name</dt>
                  <dd>{detail.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Email</dt>
                  <dd>{detail.email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Organization</dt>
                  <dd>{detail.organizationName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Want to use</dt>
                  <dd>{detail.wantToUse ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Date</dt>
                  <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Message</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3">{detail.message}</dd>
                </div>
              </dl>

              {replySent ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600 dark:text-green-400">Reply sent successfully.</p>
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reply-message">Your reply</Label>
                    <Textarea
                      id="reply-message"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply to the enquirer. This will be sent by email."
                      rows={4}
                      disabled={replyLoading}
                    />
                  </div>
                  {replyError && <p className="text-sm text-destructive">{replyError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Close
                    </Button>
                    <Button type="submit" disabled={replyLoading || !replyMessage.trim()}>
                      {replyLoading ? "Sending…" : "Send reply"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load this submission.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
