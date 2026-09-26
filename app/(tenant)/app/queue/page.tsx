import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { fetchTodayQueueItems } from "./actions";

export default async function LiveQueuePage() {
  const { tenant, user } = await requireClinicStaff();

  const formattedItems = await fetchTodayQueueItems(tenant.id);

  // 2. Fetch doctors in this clinic
  const staff = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      isDoctor: schema.users.isDoctor,
    })
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenant.id));

  const doctors = staff.filter((s) => s.isDoctor);

  // 3. Fetch active chairs in this clinic
  const chairs = await db
    .select({
      id: schema.chairs.id,
      name: schema.chairs.name,
    })
    .from(schema.chairs)
    .where(
      and(
        eq(schema.chairs.tenantId, tenant.id),
        eq(schema.chairs.isActive, true)
      )
    )
    .orderBy(schema.chairs.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
              Live Patient Queue
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-[#30D158] animate-ping" />
          </div>
          <p className="text-sm text-[#6B7280]">
            Track patient arrivals, assign dental chairs, write prescriptions, and clear payments in real time.
          </p>
        </div>
      </div>

      <QueueBoard
        initialItems={formattedItems}
        currentUserId={user.id}
        currentUserIsDoctor={user.isDoctor}
        doctors={doctors}
        chairs={chairs}
        tenantSlug={tenant.slug}
      />
    </div>
  );
}
