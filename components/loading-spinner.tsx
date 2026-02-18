export { Loading, LoadingInline, LoadingSkeleton } from "@/components/ui/loading";
import { Loading } from "@/components/ui/loading";

/** @deprecated Use <Loading message="…" /> from @/components/ui/loading */
export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return <Loading message={text} />;
}
