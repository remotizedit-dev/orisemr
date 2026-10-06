import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { fetchTodayQueueItems } from "./actions";

export const metadata = {
  title: "Live Queue",
};

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

  // 4. Fetch clinic TV secret key & chair management toggle
  const [tenantRow] = await db
    .select({
      tvDisplaySecret: schema.tenants.tvDisplaySecret,
      enableChairManagement: schema.tenants.enableChairManagement,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenant.id))
    .limit(1);

  const isAdmin = Boolean(
    user.role === "TENANT_ADMIN" ||
    user.role === "SUPER_ADMIN"
  );

  const canPrescribe = Boolean(
    (user.isDoctor ||
    user.role === "DOCTOR" ||
    user.role === "TENANT_ADMIN" ||
    user.role === "SUPER_ADMIN") &&
    user.role !== "RECEPTIONIST"
  );

  const isChairEnabled = tenantRow?.enableChairManagement ?? true;

  return (
    <QueueBoard
      initialItems={formattedItems}
      currentUserId={user.id}
      currentUserIsDoctor={user.isDoctor}
      isAdmin={isAdmin}
      canPrescribe={canPrescribe}
      doctors={doctors}
      chairs={isChairEnabled ? chairs : []}
      enableChairManagement={isChairEnabled}
      tenantSlug={tenant.slug}
      tvDisplaySecret={tenantRow?.tvDisplaySecret || undefined}
    />
  );
}
