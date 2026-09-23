export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "DOCTOR" | "RECEPTIONIST";

export type Capability =
  | "create_clinic"
  | "manage_staff"
  | "view_subscriptions"
  | "manage_features"
  | "toggle_tenant_features"
  | "broadcast"
  | "manage_master_catalog"
  | "clinic_settings"
  | "register_patient"
  | "delete_patient"
  | "manage_appointments"
  | "run_queue"
  | "write_prescription"
  | "view_prescriptions"
  | "view_clinical_notes"
  | "create_invoice"
  | "record_payment"
  | "void_invoice"
  | "delete_payment"
  | "view_reports"
  | "manage_files";

export interface UserPermissionContext {
  role: UserRole;
  isDoctor: boolean;
}

/**
 * Evaluates whether a user with given role and isDoctor flag can perform an action.
 */
export function can(user: UserPermissionContext | null | undefined, capability: Capability): boolean {
  if (!user) return false;

  const { role, isDoctor } = user;

  // Super Admin capabilities
  if (role === "SUPER_ADMIN") {
    return [
      "create_clinic",
      "manage_staff",
      "view_subscriptions",
      "manage_features",
      "broadcast",
      "manage_master_catalog",
    ].includes(capability);
  }

  // Clinic staff capabilities
  switch (capability) {
    case "create_clinic":
    case "manage_features":
    case "broadcast":
    case "manage_master_catalog":
      return false;

    case "manage_staff":
    case "toggle_tenant_features":
    case "clinic_settings":
    case "delete_patient":
    case "void_invoice":
    case "delete_payment":
      return role === "TENANT_ADMIN";

    case "view_subscriptions":
      return role === "TENANT_ADMIN";

    case "register_patient":
    case "manage_appointments":
    case "run_queue":
    case "create_invoice":
    case "record_payment":
    case "view_prescriptions":
    case "manage_files":
      return ["TENANT_ADMIN", "DOCTOR", "RECEPTIONIST"].includes(role);

    case "write_prescription":
      return isDoctor || role === "DOCTOR";

    case "view_clinical_notes":
      return isDoctor || role === "DOCTOR";

    case "view_reports":
      return ["TENANT_ADMIN", "DOCTOR", "RECEPTIONIST"].includes(role);

    default:
      return false;
  }
}
