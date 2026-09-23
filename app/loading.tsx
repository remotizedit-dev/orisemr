import PageLoader from "@/components/ui/PageLoader";

export default function RootLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <PageLoader
        label="Redirecting..."
        sublabel="Preparing your workspace"
        showSkeleton={false}
      />
    </div>
  );
}
