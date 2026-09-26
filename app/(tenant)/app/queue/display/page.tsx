import { requireClinicStaff } from "@/lib/session";
import { fetchTodayQueueItems } from "../actions";
import { QueueTvDisplay } from "@/components/queue/QueueTvDisplay";

export default async function StaffQueueDisplayPage() {
  const { tenant } = await requireClinicStaff();
  const items = await fetchTodayQueueItems(tenant.id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0A0E1A]">
      <QueueTvDisplay
        initialItems={items}
        tenantName={tenant.name}
        brandColor={tenant.brandColor}
        tenantSlug={tenant.slug}
        isPublic={false}
      />
    </div>
  );
}
