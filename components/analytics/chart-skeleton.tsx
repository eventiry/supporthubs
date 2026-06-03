import { Card, CardContent, CardHeader } from "@/components/card";
import { cn } from "@/lib/utils";

export function ChartCardSkeleton({
  className,
  height = 280,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div
          className="w-full animate-pulse rounded-lg bg-muted"
          style={{ height }}
          aria-hidden
        />
      </CardContent>
    </Card>
  );
}
