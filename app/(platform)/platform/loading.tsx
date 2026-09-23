import PageLoader from "@/components/ui/PageLoader";

export default function PlatformLoading() {
  return (
    <div className="py-6">
      <PageLoader
        label="Loading Platform Control..."
        sublabel="Aggregating tenant metrics &amp; SaaS subscriptions"
        showSkeleton={true}
      />
    </div>
  );
}
