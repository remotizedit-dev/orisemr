import PageLoader from "@/components/ui/PageLoader";

export default function TenantAppLoading() {
  return (
    <div className="py-6">
      <PageLoader
        label="Loading Chamber Data..."
        sublabel="Streaming appointments, queue &amp; clinical records"
        showSkeleton={true}
      />
    </div>
  );
}
