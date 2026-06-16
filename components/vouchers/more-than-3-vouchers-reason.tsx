"use client";

import { Input } from "@/components/input";
import { Label } from "@/components/label";

export const MORE_THAN_3_REASON_OPTIONS = [
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

export const MORE_THAN_3_OTHER_LABEL = "Other";

export function parseMultiSelectWithOther(
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

export function buildMultiSelectWithOther(
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

export interface MoreThan3VouchersReasonFieldsProps {
  value: string | undefined;
  onChange: (value: string) => void;
  vouchersInLast6Months: number;
  className?: string;
}

export function MoreThan3VouchersReasonFields({
  value,
  onChange,
  vouchersInLast6Months,
  className,
}: MoreThan3VouchersReasonFieldsProps) {
  if (vouchersInLast6Months < 3) return null;

  const parsed = parseMultiSelectWithOther(
    value,
    [...MORE_THAN_3_REASON_OPTIONS],
    MORE_THAN_3_OTHER_LABEL
  );

  return (
    <div className={className ?? "space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20"}>
      <Label>Reason for needing more than 3 vouchers in the last 6 months *</Label>
      <p className="text-sm text-muted-foreground">
        This client has been issued {vouchersInLast6Months} voucher
        {vouchersInLast6Months === 1 ? "" : "s"} in the last 6 months. Please select
        all that apply before continuing.
      </p>
      <div className="space-y-2 rounded-md border border-input bg-background p-3">
        {MORE_THAN_3_REASON_OPTIONS.map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`more3-${opt.replace(/\s/g, "-")}`}
              checked={parsed.selected.has(opt)}
              onChange={(e) => {
                const newSelected = new Set(parsed.selected);
                if (e.target.checked) newSelected.add(opt);
                else newSelected.delete(opt);
                onChange(
                  buildMultiSelectWithOther(
                    newSelected,
                    parsed.otherText,
                    MORE_THAN_3_OTHER_LABEL
                  )
                );
              }}
              className="h-4 w-4 rounded border-input"
            />
            <Label
              htmlFor={`more3-${opt.replace(/\s/g, "-")}`}
              className="font-normal cursor-pointer"
            >
              {opt}
            </Label>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="more3-Other"
            checked={parsed.selected.has(MORE_THAN_3_OTHER_LABEL)}
            onChange={(e) => {
              const newSelected = new Set(parsed.selected);
              if (e.target.checked) newSelected.add(MORE_THAN_3_OTHER_LABEL);
              else newSelected.delete(MORE_THAN_3_OTHER_LABEL);
              onChange(
                buildMultiSelectWithOther(
                  newSelected,
                  parsed.otherText,
                  MORE_THAN_3_OTHER_LABEL
                )
              );
            }}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="more3-Other" className="font-normal cursor-pointer">
            {MORE_THAN_3_OTHER_LABEL}
          </Label>
        </div>
        {parsed.selected.has(MORE_THAN_3_OTHER_LABEL) && (
          <div className="ml-6">
            <Input
              placeholder="If you select Other, add details here"
              value={parsed.otherText}
              onChange={(e) => {
                onChange(
                  buildMultiSelectWithOther(
                    parsed.selected,
                    e.target.value,
                    MORE_THAN_3_OTHER_LABEL
                  )
                );
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function hasMoreThan3VouchersReason(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0;
}
