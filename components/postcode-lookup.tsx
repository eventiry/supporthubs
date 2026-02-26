"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

const POSTCODES_IO_AUTOCOMPLETE = "https://api.postcodes.io/postcodes";
const DEBOUNCE_MS = 300;

export interface PostcodeLookupProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (postcode: string) => void;
  /** When user selects an address, called with (postcode, addressLine). Use to fill address field. */
  onAddressSelect?: (postcode: string, addressLine: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** Fetch autocomplete suggestions for a UK postcode (postcodes.io). */
async function fetchPostcodeSuggestions(query: string): Promise<string[]> {
  const q = query.trim().toUpperCase().replace(/\s+/g, " ");
  if (q.length < 3) return [];
  const encoded = encodeURIComponent(q);
  const res = await fetch(`${POSTCODES_IO_AUTOCOMPLETE}/${encoded}/autocomplete`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.result) ? data.result : [];
}

/** Fetch full postcode details and build a single address line (admin_ward, admin_district, region). */
async function fetchPostcodeDetails(postcode: string): Promise<string> {
  const encoded = encodeURIComponent(postcode.trim().replace(/\s+/g, ""));
  const res = await fetch(`${POSTCODES_IO_AUTOCOMPLETE}/${encoded}`);
  if (!res.ok) return "";
  const data = await res.json();
  const r = data.result;
  if (!r) return "";
  const parts = [r.admin_ward, r.admin_district, r.region].filter(Boolean);
  return parts.join(", ") || postcode;
}

export function PostcodeLookup({
  id = "postcode-lookup",
  label = "Postcode",
  value,
  onChange,
  onAddressSelect,
  disabled,
  placeholder = "e.g. NE6 3XH",
  className,
}: PostcodeLookupProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const runAutocomplete = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchPostcodeSuggestions(q);
      setSuggestions(list);
      setOpen(list.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onChange(v);
    setOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runAutocomplete(v), DEBOUNCE_MS);
  };

  const handleSelect = async (selectedPostcode: string) => {
    setInputValue(selectedPostcode);
    onChange(selectedPostcode);
    setOpen(false);
    setSuggestions([]);
    if (onAddressSelect) {
      try {
        const addressLine = await fetchPostcodeDetails(selectedPostcode);
        onAddressSelect(selectedPostcode, addressLine);
      } catch {
        onAddressSelect(selectedPostcode, "");
      }
    }
  };

  return (
    <div ref={containerRef} className={className ?? "space-y-2"}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Searching…
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul
            className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-input bg-background py-1 shadow-md"
            role="listbox"
          >
            {suggestions.map((pc) => (
              <li
                key={pc}
                role="option"
                aria-selected={value === pc}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleSelect(pc)}
              >
                {pc}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
