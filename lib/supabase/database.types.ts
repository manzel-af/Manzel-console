// Copied from the Manzel app (src/lib/supabase/database.types.ts) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

/**
 * Database types, as the app wants to see them.
 *
 * Hand-maintained, and deliberately narrower than the database: a text column
 * with a CHECK constraint is a union here (InvoiceStatus, not string), and
 * money is `number` because every amount is a bigint of minor units well
 * inside 2^53.
 *
 * It is NOT regenerated. `npm run db:types` regenerates database.generated.ts
 * from the live schema and then typechecks; schema-drift.ts fails that
 * typecheck, naming the table and column, if this file disagrees with the
 * database about which columns exist or which can be null. Fix it here.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type AppRole = 'super_admin' | 'manager' | 'accountant' | 'guard' | 'resident';
export type UnitStatus = 'occupied' | 'vacant' | 'under_construction';
export type Relationship = 'owner' | 'tenant' | 'family';
export type ChargeBasis = 'flat' | 'per_sqm' | 'per_unit_share';
export type Recurrence = 'monthly' | 'quarterly' | 'yearly' | 'one_off';
export type InvoiceStatus = 'draft' | 'open' | 'part_paid' | 'paid' | 'void';
export type ChargeAppliesTo = 'all' | 'selected';
export type VoidScope = 'drafts' | 'unpaid' | 'all';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'hesabpay' | 'other';
export type TicketCategory =
  | 'plumbing' | 'electrical' | 'lift' | 'generator' | 'cleaning' | 'security' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high';
export type AnnouncementCategory =
  | 'general' | 'maintenance' | 'water' | 'power' | 'security' | 'payment' | 'event';
export type PassStatus = 'active' | 'used' | 'expired' | 'revoked';
export type PassPurpose = 'guest' | 'delivery' | 'service' | 'other';
export type GateDirection = 'in' | 'out';
export type GateOutcome = 'allowed' | 'denied';
export type DeniedReason = 'not_found' | 'expired' | 'revoked' | 'already_used' | 'outside_window';

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type BuildingRow = Timestamps & {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string;
  default_currency: string;
  timezone: string;
  billing_day: number;
  due_days: number;
  active: boolean;
  /** V025. Null while the building is open. */
  suspension_code: BuildingSuspensionCode | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  /** V031. The complex whose office runs it; null for a building on its own. */
  complex_id: string | null;
  deleted_at: string | null;
}

/** 'manual' is an operator's decision; 'fee_overdue' is the platform fee (V025). */
export type BuildingSuspensionCode = 'manual' | 'fee_overdue';

export type UnitRow = Timestamps & {
  id: string;
  building_id: string;
  block: string | null;
  number: string;
  floor: number | null;
  area_sqm: number | null;
  status: UnitStatus;
  notes: string | null;
  deleted_at: string | null;
}

export type ProfileRow = Timestamps & {
  id: string;
  full_name: string;
  phone: string;
  preferred_language: 'fa-AF' | 'ps-AF' | 'en';
  preferred_numerals: 'arabic' | 'latin';
  preferred_theme: 'system' | 'light' | 'dark';
  deleted_at: string | null;
}

export type MembershipRow = Timestamps & {
  id: string;
  building_id: string;
  profile_id: string;
  role: AppRole;
  unit_id: string | null;
  relationship: Relationship | null;
  is_primary_contact: boolean;
  active: boolean;
  /** V031. Set when the complex office holds this role (complex_members). */
  complex_member_id: string | null;
  /** V031. Theirs before the office covered it: given back, not ended, when it stops. */
  held_before_complex: boolean;
  deleted_at: string | null;
}

export type ChargeTypeRow = Timestamps & {
  id: string;
  building_id: string;
  name_fa: string;
  name_ps: string;
  name_en: string;
  basis: ChargeBasis;
  default_amount_minor: number;
  currency: string;
  recurrence: Recurrence;
  /** V018. 'selected' charges bill only flats with an enabled unit_charges row. */
  applies_to: ChargeAppliesTo;
  active: boolean;
  sort_order: number;
  deleted_at: string | null;
}

export type InvoiceRow = Timestamps & {
  id: string;
  building_id: string;
  unit_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  currency: string;
  total_minor: number;
  paid_minor: number;
  status: InvoiceStatus;
  note: string | null;
  /** V018. The voided invoice this one corrects. */
  replaces_id: string | null;
  voided_at: string | null;
  void_reason: string | null;
  deleted_at: string | null;
}

export type InvoiceLineRow = Timestamps & {
  id: string;
  building_id: string;
  invoice_id: string;
  charge_type_id: string | null;
  description_fa: string;
  description_ps: string;
  description_en: string;
  quantity: number;
  amount_minor: number;
  /** V018. Set when only part of the period was billed: billed_days of period_days. */
  billed_days: number | null;
  period_days: number | null;
}

/** V018. One flat's settings for one charge. */
export type UnitChargeRow = Timestamps & {
  id: string;
  building_id: string;
  unit_id: string;
  charge_type_id: string;
  enabled: boolean;
  starts_on: string | null;
  ends_on: string | null;
  amount_minor: number | null;
  note: string | null;
  created_by: string | null;
  deleted_at: string | null;
}

/** V018. A hard-deleted mirrored row, so devices can drop their copy. */
export type DeletedRowRow = Timestamps & {
  id: string;
  building_id: string;
  table_name: 'invoice_lines' | 'payment_allocations' | 'unit_credits';
  row_id: string;
}

/** V018. billing_period_status(): a period's invoices against today's charges. */
/** set_announcement_state() (V020). 'end' stops showing a notice now; 'resume' undoes it. */
export type AnnouncementState = 'publish' | 'end' | 'resume' | 'delete';

/** end_membership() (V020). */
export interface EndMembershipResult {
  building_id: string;
  role: AppRole;
  unit_id: string | null;
  /** No active resident is left in the flat — it may be vacant now. */
  unit_empty: boolean;
  /** The caller left; otherwise staff ended someone else's membership. */
  self: boolean;
}

export interface BillingPeriodStatus {
  expected_units: number;
  expected_total: number;
  invoiced: number;
  invoiced_total: number;
  paid_total: number;
  drafts: number;
  published: number;
  with_payments: number;
  voided: number;
  missing: number;
  differing: number;
}

/** V018. recalculate_invoices() result. */
export interface RecalculateResult {
  updated: number;
  reissued: number;
  unchanged: number;
  voided: number;
  missing: number;
  moved_minor: number;
  credit_minor: number;
}

/** V018. A line as update_invoice_lines() takes it. */
export interface InvoiceLineInput {
  charge_type_id: string | null;
  description_fa: string;
  description_ps: string;
  description_en: string;
  quantity: number;
  amount_minor: number;
  billed_days: number | null;
  period_days: number | null;
}

export type PaymentRow = Timestamps & {
  id: string;
  building_id: string;
  unit_id: string;
  client_id: string | null;
  amount_minor: number;
  currency: string;
  method: PaymentMethod;
  reference: string | null;
  received_at: string;
  /** Null only for a settlement confirmed by a signed provider webhook (V014). */
  recorded_by: string | null;
  receipt_number: string;
  note: string | null;
  is_reversal: boolean;
  reverses_id: string | null;
  reversed_at: string | null;
  deleted_at: string | null;
}

export type PaymentAllocationRow = Timestamps & {
  id: string;
  building_id: string;
  payment_id: string;
  invoice_id: string;
  amount_minor: number;
}

export type UnitCreditRow = Timestamps & {
  id: string;
  building_id: string;
  unit_id: string;
  payment_id: string | null;
  amount_minor: number;
  reason: string;
}

export type AnnouncementRow = Timestamps & {
  id: string;
  building_id: string;
  author_id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
  /** V032. Shared by the copies of one notice sent to several buildings. */
  batch_id: string | null;
  deleted_at: string | null;
}

export type AnnouncementReadRow = {
  announcement_id: string;
  profile_id: string;
  building_id: string;
  read_at: string;
}

export type TicketRow = Timestamps & {
  id: string;
  building_id: string;
  unit_id: string | null;
  client_id: string | null;
  ticket_number: string | null;
  raised_by: string;
  assigned_to: string | null;
  category: TicketCategory;
  title: string;
  description: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  resolved_at: string | null;
  closed_at: string | null;
  deleted_at: string | null;
}

export type TicketCommentRow = Timestamps & {
  id: string;
  building_id: string;
  ticket_id: string;
  author_id: string;
  client_id: string | null;
  body: string;
  status_from: string | null;
  status_to: string | null;
  deleted_at: string | null;
}

export type VisitorPassRow = Timestamps & {
  id: string;
  building_id: string;
  unit_id: string;
  created_by: string;
  client_id: string | null;
  visitor_name: string;
  visitor_count: number;
  purpose: PassPurpose | null;
  code: string;
  valid_from: string;
  valid_until: string;
  status: PassStatus;
  deleted_at: string | null;
}

export type GateEventRow = Timestamps & {
  id: string;
  building_id: string;
  pass_id: string | null;
  client_id: string | null;
  direction: GateDirection;
  visitor_name: string | null;
  unit_label: string | null;
  outcome: GateOutcome;
  denied_reason: DeniedReason | null;
  recorded_by: string | null;
  occurred_at: string;
}

export type InviteCodeRow = Timestamps & {
  id: string;
  building_id: string;
  code: string;
  role: AppRole;
  unit_id: string | null;
  relationship: Relationship | null;
  full_name: string | null;
  phone: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string;
  revoked_at: string | null;
  /** Null for the system-issued first-manager invite (V006). */
  created_by: string | null;
}

export type DeviceTokenRow = Timestamps & {
  id: string;
  profile_id: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  app_version: string | null;
  locale: string | null;
  last_seen_at: string;
  /** V036: SHA-256 of the key this phone's notifications act with while the app is closed. */
  action_key_hash: string | null;
}

/** V017. Someone asking to register a building; nothing exists until approved. */
export type BuildingRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type RequesterRole = 'manager' | 'owner' | 'committee' | 'other';
/** V031. A complex is approved as one, and its office adds the buildings. */
export type BuildingRequestKind = 'building' | 'complex';

export type BuildingRequestRow = {
  id: string;
  requester_id: string;
  status: BuildingRequestStatus;
  kind: BuildingRequestKind;
  /** For a complex: how many buildings it has. */
  building_count: number | null;
  /** For an approved complex. */
  complex_id: string | null;
  building_name: string;
  building_code: string;
  city: string;
  district: string | null;
  address: string | null;
  unit_count: number;
  requester_role: RequesterRole;
  note: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  building_id: string | null;
  created_at: string;
  updated_at: string;
}

/** V017. An operator of the platform itself. */
export type PlatformAdminRow = {
  profile_id: string;
  created_at: string;
  created_by: string | null;
}

/** One row of admin_building_requests(): a request plus what the operator needs to judge it. */
export type AdminBuildingRequest = BuildingRequestRow & {
  requester_name: string;
  requester_phone: string | null;
  requester_since: string | null;
  requester_requests: number;
  requester_buildings: number;
  similar_buildings: { id: string; name: string; code: string; city: string; score: number }[];
  similar_complexes: { id: string; name: string; code: string; city: string; buildings: number; score: number }[];
  similar_requests: {
    id: string; name: string; code: string; status: BuildingRequestStatus; kind: BuildingRequestKind; requester_id: string;
  }[];
}

// ---- V031: complexes ----------------------------------------------------

/** Office roles: who runs a complex's buildings. */
export type ComplexRole = 'manager' | 'accountant' | 'guard';

/** A residential complex, or any office running several buildings. */
export type ComplexRow = Timestamps & {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string | null;
  billing_day: number;
  due_days: number;
  created_by: string | null;
  deleted_at: string | null;
}

/** A place in a complex's office: a role in every building (building_ids null) or some. */
export type ComplexMemberRow = Timestamps & {
  id: string;
  complex_id: string;
  profile_id: string;
  role: ComplexRole;
  building_ids: string[] | null;
  active: boolean;
  added_by: string | null;
  deleted_at: string | null;
}

export type ComplexInviteRow = Timestamps & {
  id: string;
  complex_id: string;
  code: string;
  role: ComplexRole;
  building_ids: string[] | null;
  full_name: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string;
  revoked_at: string | null;
  created_by: string | null;
}

/** One entry of my_complexes(): a complex whose office the caller is in. */
export interface MyComplex {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string | null;
  billing_day: number;
  due_days: number;
  /** The caller's strongest role in the office. */
  role: ComplexRole;
  /** The buildings that role covers; null for all of them. */
  scope: string[] | null;
  buildings: { id: string; name: string; code: string }[];
}

/** complex_office(): the office and, for its managers, its open codes. */
export interface ComplexOffice {
  members: {
    id: string;
    profile_id: string;
    full_name: string;
    phone: string | null;
    role: ComplexRole;
    building_ids: string[] | null;
    created_at: string;
    self: boolean;
  }[];
  invites: {
    id: string;
    code: string;
    role: ComplexRole;
    building_ids: string[] | null;
    full_name: string | null;
    max_uses: number;
    used_count: number;
    expires_at: string;
    created_at: string;
  }[];
}

/** One building for complex_add_buildings(). */
export interface ComplexBuildingInput {
  name: string;
  code: string;
  floor_from?: number;
  floor_to?: number;
  per_floor?: number;
  blocks?: string[];
  area_sqm?: number | null;
}

/** One row of admin_buildings(). */
export type AdminBuilding = {
  id: string;
  name: string;
  code: string;
  city: string;
  created_at: string;
  /** False: suspended (V022) — closed to its members. */
  active: boolean;
  flats: number;
  members: number;
  managers: string | null;
  open_invites: number;
  currency: string;
  outstanding_minor: number;
}

// ---- V022: the platform control panel --------------------------------------

export type PlatformTone = 'info' | 'success' | 'warning' | 'danger' | 'brand' | 'neutral';
export type PlatformAudience = 'all' | 'staff' | 'managers' | 'residents' | 'guards';

// ---- V036: content in every language, with buttons and a question -------------

/** The languages the operator writes in: the app's own. */
export type ContentLanguage = 'fa-AF' | 'ps-AF' | 'en';
/** One label in each language. */
export type ContentLabel = Record<ContentLanguage, string>;
/** The title and text in each language — all three, or `{}` for what was written before V036. */
export type ContentTranslations = Partial<Record<ContentLanguage, { title: string; body?: string }>>;
/** A link button. Banners have up to four, notifications three. */
export type ContentButton = { url: string; label: ContentLabel };
/** A question: a typed answer, or two to six choices. */
export type ContentQuestion =
  | { kind: 'text'; prompt: ContentLabel }
  | { kind: 'choice'; prompt: ContentLabel; choices: ContentLabel[] };

export type PlatformAnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  tone: PlatformTone;
  /** `#RRGGBB`, overriding the tone's colour. */
  color: string | null;
  /** One of the app's icon names. */
  icon: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  audience: PlatformAudience;
  building_id: string | null;
  starts_at: string;
  ends_at: string | null;
  dismissible: boolean;
  active: boolean;
  priority: number;
  /** V036. With these, title, body and the link are kept in Dari for older apps. */
  translations: ContentTranslations;
  buttons: ContentButton[];
  question: ContentQuestion | null;
  /** V037: which apps see it; null for every one. */
  apps: AppTarget | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** V037: one install of the app, as admin_app_installs() lists it. */
export type AdminAppInstall = {
  /** The install's own id; "push:…" or "presence:…" for an app from before V037. */
  install_id: string;
  source: 'app' | 'push' | 'presence';
  profile_id: string;
  full_name: string | null;
  phone: string | null;
  platform: 'android' | 'ios' | 'web';
  app_version: string | null;
  build_number: string | null;
  version_label: string | null;
  runtime_version: string | null;
  update_id: string | null;
  update_created_at: string | null;
  channel: string | null;
  os_version: string | null;
  device_model: string | null;
  device_brand: string | null;
  locale: string | null;
  has_push: boolean;
  online: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

/** V037: one version in use on one platform, as admin_app_versions() counts it. */
export type AdminAppVersion = {
  platform: 'android' | 'ios' | 'web';
  label: string;
  installs: number;
  people: number;
  /** Seen in the last 30 days. */
  active: number;
  last_seen_at: string;
  first_seen_at: string;
}

export type OperatorAlertKind = 'support' | 'building_request' | 'idea' | 'report' | 'chat_report' | 'test';
export type OperatorAlertStatus = 'pending' | 'sent' | 'failed' | 'skipped';

/** V037: something the operators are told about by email and web push. */
export type OperatorAlertRow = {
  id: string;
  kind: OperatorAlertKind;
  mailbox: 'support' | 'admin';
  entity_id: string | null;
  title: string;
  detail: string | null;
  /** Where it is in the console: /support/<id>, /requests/<id>, /ideas … */
  path: string;
  created_by: string | null;
  created_at: string;
  email_status: OperatorAlertStatus;
  email_error: string | null;
  emailed_at: string | null;
  push_status: OperatorAlertStatus;
  push_error: string | null;
  pushed: number;
  pushed_at: string | null;
  attempts: number;
  claimed_at: string | null;
}

/** V037: a console that receives alerts by web push. */
export type OperatorPushSubscriptionRow = {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  language: 'fa-AF' | 'ps-AF' | 'en';
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
}

/** V036: one person's answer to a banner's or a notification's question. */
export type PlatformAnswerRow = {
  id: string;
  profile_id: string;
  announcement_id: string | null;
  campaign_id: string | null;
  /** The chosen choice's place in the list (choice questions). */
  choice: number | null;
  /** What they typed (text questions). */
  answer: string | null;
  /** Where it was given: in the app, or inside the notification itself. */
  via: 'app' | 'notification';
  created_at: string;
  updated_at: string;
}

/** V036: admin_platform_answers() — who answered what. */
export type AdminPlatformAnswers = {
  question: ContentQuestion | null;
  total: number;
  counts: { choice: number; count: number }[];
  answers: (Pick<PlatformAnswerRow, 'id' | 'profile_id' | 'choice' | 'answer' | 'via' | 'created_at' | 'updated_at'> & {
    full_name: string | null;
    phone: string | null;
    /** The buildings they are in, by name. */
    buildings: string | null;
  })[];
}

export type PlatformSettingsRow = {
  id: boolean;
  maintenance_enabled: boolean;
  maintenance_message: string | null;
  building_requests_open: boolean;
  support_phone: string | null;
  support_whatsapp: string | null;
  support_email: string | null;
  /** V025. What every building pays the platform each month, in minor units. */
  monthly_fee_minor: number;
  fee_currency: string;
  /** Days from issue before the fee is overdue and the building closes. */
  grace_days: number;
  billing_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type AdminPlatformStats = {
  buildings: number;
  buildings_suspended: number;
  flats: number;
  flats_occupied: number;
  people: number;
  people_in_buildings: number;
  managers: number;
  residents: number;
  guards: number;
  accountants: number;
  operators: number;
  signups_7d: number;
  requests_pending: number;
  tickets_open: number;
  notices_live: number;
  banners_live: number;
  /** V023. In the foreground within the last 150 seconds. */
  online_now: number;
  active_24h: number;
  active_7d: number;
  /** People with at least one push-capable device, and those devices. */
  push_people: number;
  push_devices: number;
  pushes_30d: number;
  /** Currency → minor units. */
  outstanding: Record<string, number>;
  collected_30d: Record<string, number>;
}

export type AdminStaffMember = {
  membership_id: string;
  profile_id: string;
  role: AppRole;
  full_name: string;
  phone: string | null;
}

export type AdminInvite = {
  id: string;
  code: string;
  role: AppRole;
  expires_at: string;
  used_count: number;
  max_uses: number;
}

export type AdminBuildingDetail = {
  building: BuildingRow;
  flats: number;
  flats_occupied: number;
  members: number;
  residents: number;
  invoices: number;
  payments: number;
  outstanding_minor: number;
  collected_30d_minor: number;
  tickets_open: number;
  last_activity: string | null;
  staff: AdminStaffMember[];
  invites: AdminInvite[];
  /** The operator's own membership here, if they entered the building. */
  my_membership_id: string | null;
}

export type AdminUser = {
  profile_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  phone_verified: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  suspended: boolean;
  is_operator: boolean;
  buildings: number;
  building_names: string | null;
  /** V023. The later of the last check-in and the last sign-in. */
  last_seen_at: string | null;
  online: boolean;
  platform: 'android' | 'ios' | 'web' | null;
  app_version: string | null;
  /** Push-capable devices. */
  devices: number;
}

export type AdminUserDetail = {
  profile_id: string;
  full_name: string;
  phone: string | null;
  preferred_language: string;
  email: string | null;
  phone_verified: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  suspended: boolean;
  is_operator: boolean;
  memberships: {
    membership_id: string;
    building_id: string;
    building_name: string;
    role: AppRole;
    unit_label: string | null;
    active: boolean;
    created_at: string;
  }[];
  activity: { payments_recorded: number; tickets: number; notices: number };
  deletable: boolean;
  /** V023. */
  presence: {
    last_seen_at: string | null;
    online: boolean;
    foreground: boolean | null;
    platform: 'android' | 'ios' | 'web' | null;
    app_version: string | null;
  };
  devices: { platform: 'android' | 'ios' | 'web'; app_version: string | null; last_seen_at: string }[];
  notifications: { received: number; read: number };
}

// ---- V023: presence and operator notifications ------------------------------

export type UserPresenceRow = {
  profile_id: string;
  last_seen_at: string;
  foreground: boolean;
  platform: 'android' | 'ios' | 'web' | null;
  app_version: string | null;
  updated_at: string;
}

export type PushImportance = 'normal' | 'high' | 'quiet';
export type NotificationScreen =
  'home' | 'inbox' | 'notices' | 'bills' | 'repairs' | 'settings'
  | 'requests' | 'support' | 'ideas' | 'fee' | 'chat' | 'calls' | 'meetings';
/** V024: what a notification is about. */
export type NotificationKind =
  'broadcast' | 'join_request' | 'join_decision' | 'account'
  | 'support' | 'request_update' | 'billing' | 'chat' | 'call' | 'meeting';
/** 'skipped': written by the database itself (a meeting reminder) and never pushed (V029). */
export type PushStatus = 'pending' | 'no_device' | 'sent' | 'delivered' | 'failed' | 'skipped';

/**
 * V037: which apps something is for — some platforms, and at most one way of
 * choosing versions. A version is a label, "1.0.0+14" (version and build) or
 * "1.0.0" (an app that never said its build). Checked by platform_apps_valid.
 */
export type AppTarget = {
  platforms?: ('android' | 'ios' | 'web')[];
  /** These versions. */
  only?: string[];
  /** Older than this one; an app whose version is not known counts as older. */
  below?: string;
  /** This one and newer. */
  atLeast?: string;
}

export type PushAudience = {
  mode: 'all' | 'selected' | 'online' | 'offline' | 'inactive';
  profileIds?: string[];
  inactiveHours?: number;
  role?: 'managers' | 'staff' | 'residents' | 'guards' | null;
  buildingId?: string | null;
  /** V037: only the people — and only the phones — running these apps. */
  apps?: AppTarget | null;
}

export type PushCampaignRow = {
  id: string;
  client_id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  screen: NotificationScreen | null;
  importance: PushImportance;
  audience: PushAudience;
  is_test: boolean;
  status: 'sending' | 'sent' | 'failed';
  recipients: number;
  reachable: number;
  devices: number;
  push_ok: number;
  push_failed: number;
  push_delivered: number;
  receipts_checked_at: string | null;
  error: string | null;
  /** V036. With these, title, body and the link are kept in Dari for older apps. */
  translations: ContentTranslations;
  buttons: ContentButton[];
  question: ContentQuestion | null;
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
}

/** One person's copy of an operator notification: their inbox. */
export type NotificationRow = {
  id: string;
  profile_id: string;
  campaign_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  screen: NotificationScreen | null;
  importance: PushImportance;
  push_status: PushStatus;
  push_tickets: string[];
  push_error: string | null;
  read_at: string | null;
  /** V036: a broadcast's every language, buttons and question; title and body are in the reader's language. */
  translations: ContentTranslations;
  buttons: ContentButton[];
  question: ContentQuestion | null;
  created_at: string;
}

// ---- V024: account status, the building's QR, join requests -----------------

/**
 * Why an account cannot be used. The ban itself is GoTrue's; this row is the
 * signal the app listens to (Realtime), and the reason it shows.
 */
export type AccountStatusRow = {
  profile_id: string;
  suspended: boolean;
  reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  updated_at: string;
}

/** The token printed in a building's QR. Staff only; rotating it kills old posters. */
export type BuildingQrRow = {
  building_id: string;
  token: string;
  rotated_at: string;
  rotated_by: string | null;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type JoinRole = 'resident' | 'guard' | 'accountant' | 'manager';

export type JoinRequestRow = {
  id: string;
  building_id: string;
  profile_id: string;
  role: JoinRole;
  unit_id: string | null;
  relationship: Relationship | null;
  full_name: string;
  phone: string | null;
  note: string | null;
  status: JoinRequestStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  membership_id: string | null;
  created_at: string;
  updated_at: string;
}

/* ---------------------------------------------------------------------------
 * V025 — what a building pays the platform
 * ------------------------------------------------------------------------- */

export type PlatformInvoiceStatus = 'open' | 'paid' | 'waived';
export type PlatformFeeMethod = 'cash' | 'transfer' | 'wallet' | 'other';

/** One month's platform fee for one building. Written only by the functions. */
export type PlatformInvoiceRow = {
  id: string;
  building_id: string;
  period_start: string;
  period_end: string;
  amount_minor: number;
  currency: string;
  /** The flats at the time it was issued, and each one's share of the fee. */
  flats: number;
  share_minor: number;
  due_date: string;
  status: PlatformInvoiceStatus;
  paid_at: string | null;
  paid_by: string | null;
  method: PlatformFeeMethod | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** 'none' until the first fee is issued. */
export type BuildingFeeStatus = 'none' | 'open' | 'overdue' | 'paid' | 'waived';

/**
 * The one row a closed building's members can still read: whether the building
 * is open, why not, and where the fee stands. In the Realtime publication, so
 * a suspension or a payment reaches every phone in seconds.
 */
export type BuildingStatusRow = {
  building_id: string;
  name: string;
  active: boolean;
  suspension_code: BuildingSuspensionCode | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  fee_status: BuildingFeeStatus;
  fee_due_date: string | null;
  fee_amount_minor: number | null;
  fee_share_minor: number | null;
  fee_currency: string | null;
  updated_at: string;
}

/** One row of my_building_billing(). */
export type MyBuildingBilling = {
  building_id: string;
  building_name: string;
  role: AppRole | null;
  active: boolean;
  suspension_code: BuildingSuspensionCode | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  fee_status: BuildingFeeStatus;
  fee_due_date: string | null;
  fee_amount_minor: number | null;
  fee_share_minor: number | null;
  fee_currency: string | null;
  flats: number;
  /** Negative once the due date has passed. Null when there is nothing to pay. */
  days_left: number | null;
}

/** One row of admin_platform_billing(). */
export type AdminBuildingBilling = {
  building_id: string;
  building_name: string;
  building_code: string;
  active: boolean;
  suspension_code: BuildingSuspensionCode | null;
  flats: number;
  invoice_id: string | null;
  period_start: string | null;
  due_date: string | null;
  amount_minor: number | null;
  share_minor: number | null;
  currency: string | null;
  status: BuildingFeeStatus;
  days_overdue: number;
  paid_at: string | null;
  unpaid_months: number;
  owed_minor: number;
}

export type BillingRunResult = {
  issued: number;
  closed: number;
  period?: string;
  skipped?: 'billing_disabled';
}

/* ---------------------------------------------------------------------------
 * V026 — talking to the platform
 * ------------------------------------------------------------------------- */

export type SupportTopic = 'account' | 'payments' | 'building' | 'app' | 'other';
/** 'open' is waiting for an operator; 'assigned' belongs to one. */
export type SupportStatus = 'open' | 'assigned' | 'resolved' | 'closed';

export type SupportThreadRow = {
  id: string;
  profile_id: string;
  building_id: string | null;
  subject: string;
  topic: SupportTopic;
  status: SupportStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  last_message_at: string;
  last_from_staff: boolean;
  unread_user: number;
  unread_staff: number;
  messages: number;
  /** V028. When each side last had the thread open — the "they are reading
      this right now" signal that suppresses a redundant push. */
  user_seen_at: string | null;
  staff_seen_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export type SupportMessageRow = {
  id: string;
  thread_id: string;
  author_id: string;
  from_staff: boolean;
  body: string | null;
  /** A path in the private support-attachments bucket, not a URL. */
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  /** Set when the attachment is a voice note (V028). */
  attachment_duration_ms: number | null;
  created_at: string;
}

/** One row of my_support_threads(). */
export type MySupportThread = {
  id: string;
  subject: string;
  topic: SupportTopic;
  status: SupportStatus;
  building_id: string | null;
  building_name: string | null;
  assigned_name: string | null;
  last_message_at: string;
  last_from_staff: boolean;
  last_preview: string | null;
  unread: number;
  messages: number;
  created_at: string;
}

/** One row of admin_support_threads(), which also says who is asking. */
export type AdminSupportThread = {
  id: string;
  subject: string;
  topic: SupportTopic;
  status: SupportStatus;
  profile_id: string;
  person_name: string;
  person_phone: string;
  person_since: string;
  building_id: string | null;
  building_name: string | null;
  person_role: AppRole | null;
  assigned_to: string | null;
  assigned_name: string | null;
  mine: boolean | null;
  last_message_at: string;
  last_from_staff: boolean;
  last_preview: string | null;
  unread: number;
  messages: number;
  created_at: string;
}

/** One message as support_thread() returns it, with the author's name. */
export type SupportMessage = {
  id: string;
  author_id: string;
  from_staff: boolean;
  author_name: string | null;
  body: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  attachment_duration_ms: number | null;
  created_at: string;
}

/** Who support is talking to. Null for the person themselves. */
export type SupportPerson = {
  id: string;
  name: string;
  phone: string;
  language: string;
  since: string;
  buildings: { name: string; role: AppRole; flat: string | null }[];
}

export type SupportThreadDetail = {
  thread: {
    id: string;
    subject: string;
    topic: SupportTopic;
    status: SupportStatus;
    assigned_to: string | null;
    assigned_name: string | null;
    mine: boolean | null;
    created_at: string;
    messages: number;
    building_id: string | null;
    building_name: string | null;
  };
  person: SupportPerson | null;
  messages: SupportMessage[];
}

export type SupportCounts = { queue: number; mine: number; unread: number };

export type OperatorSummary = {
  profile_id: string;
  full_name: string;
  phone: string;
  is_me: boolean;
}

export type PlatformRequestKind = 'feature' | 'report';
export type PlatformRequestCategory = 'feature' | 'bug' | 'abuse' | 'payment' | 'content' | 'other';
export type PlatformRequestStatus =
  'new' | 'reviewing' | 'planned' | 'in_progress' | 'done' | 'declined';

export type PlatformRequestRow = {
  id: string;
  profile_id: string;
  building_id: string | null;
  kind: PlatformRequestKind;
  category: PlatformRequestCategory;
  title: string;
  body: string;
  attachment_path: string | null;
  attachment_type: string | null;
  status: PlatformRequestStatus;
  /** When the operator expects it. Shown to the person who asked. */
  target_date: string | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

/** One row of admin_platform_requests(). */
export type AdminPlatformRequest = {
  id: string;
  kind: PlatformRequestKind;
  category: PlatformRequestCategory;
  title: string;
  body: string;
  status: PlatformRequestStatus;
  target_date: string | null;
  decision_note: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  profile_id: string;
  person_name: string;
  person_phone: string;
  building_id: string | null;
  building_name: string | null;
  decided_by: string | null;
  decided_name: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RequestCounts = { features_new: number; reports_new: number; open: number };

/* ---------------------------------------------------------------------------
 * V027 — the building's own room
 * ------------------------------------------------------------------------- */

export type BuildingChatMessageRow = {
  id: string;
  building_id: string;
  author_id: string;
  body: string | null;
  /** A path in the private chat-attachments bucket, never a URL. */
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  /** Set when the attachment is a voice note (V028). */
  attachment_duration_ms: number | null;
  created_at: string;
  /** Soft: a removed message keeps its place, without its words. */
  deleted_at: string | null;
  deleted_by: string | null;
  /** V029: a text message, or a card pointing at a call or a meeting. */
  kind: ChatMessageKind;
  call_id: string | null;
  meeting_id: string | null;
  /** V034: the message this one answers, in the same room. */
  reply_to_id: string | null;
  /** V034: when the author last changed it (they may for 48 hours). */
  edited_at: string | null;
}

export type ChatMessageKind = 'text' | 'call' | 'meeting';

export type BuildingChatReadRow = {
  building_id: string;
  profile_id: string;
  /** V034: null when the phone has the messages but the room was never opened. */
  last_read_at: string | null;
  /** V034: how far this person's phone has received (read implies received). */
  last_delivered_at: string | null;
  /** V036: when they last had the room open in the app — what "watching" means; reading from a notification does not move it. */
  watched_at: string | null;
  muted: boolean;
  updated_at: string;
}

/** V034: one person's reaction to one message. Read through the history only. */
export type BuildingChatReactionRow = {
  message_id: string;
  profile_id: string;
  building_id: string;
  emoji: string;
  created_at: string;
}

/** V035: a pinned message of the room. Read through building_chat_pins() only. */
export type BuildingChatPinRow = {
  message_id: string;
  building_id: string;
  /** Null once that account is gone. */
  pinned_by: string | null;
  pinned_at: string;
  expires_at: string;
}

/** V035: one row of building_chat_pins(): a pin as the top of the room shows it. */
export type ChatPin = {
  message_id: string;
  author_id: string;
  /** A deleted account has no name: the app says "Former member". */
  author_name: string | null;
  /** The first 160 characters of what it says, or null for a photo or a voice note alone. */
  body: string | null;
  attachment_type: string | null;
  /** When the message was sent: the app loads back to it to show it. */
  created_at: string;
  pinned_by: string | null;
  pinned_by_name: string | null;
  pinned_at: string;
  expires_at: string;
}

/** V034: a message's reactions, one entry per emoji, most used first. */
export type ChatReaction = {
  emoji: string;
  count: number;
  /** One of them is the caller's. */
  mine: boolean;
  /** Who, in the order they reacted. A deleted account has no name. */
  people: { id: string; name: string | null }[];
}

/** V034: what a reply answers, as the history draws it above the reply. */
export type ChatReplyPreview = {
  id: string;
  author_id: string;
  author_name: string | null;
  /** Null once it is removed, or when its author is someone the caller blocked. */
  body: string | null;
  attachment_type: string | null;
  deleted: boolean;
  /** Its author is someone the caller has blocked. */
  hidden: boolean;
}

/**
 * V034: the ticks on one of the caller's own messages — of the people it was
 * for, how many have it on their phone, and how many have read it.
 */
export type ChatReceiptSummary = { total: number; delivered: number; read: number }

/** V034: one row of building_chat_receipts(), for the message's author. */
export type ChatReceiptRow = {
  profile_id: string;
  full_name: string | null;
  member_role: AppRole | null;
  state: 'read' | 'delivered' | 'waiting';
}

/** One row of building_chat_history(), newest first. */
export type ChatMessage = {
  id: string;
  author_id: string;
  /** V033: null for a deleted account — the app shows "Former member". */
  author_name: string | null;
  author_role: AppRole | null;
  body: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  attachment_duration_ms: number | null;
  created_at: string;
  deleted_at: string | null;
  mine: boolean;
  /** V029: 'call' and 'meeting' rows are cards, drawn from `call` / `meeting`. */
  kind: ChatMessageKind;
  call: ChatCallCard | null;
  meeting: MeetingSummary | null;
  // V034. Optional: a server before V034 does not send them.
  reply_to_id?: string | null;
  reply?: ChatReplyPreview | null;
  edited_at?: string | null;
  reactions?: ChatReaction[];
  /** The caller's own messages only; null on everyone else's. */
  receipt?: ChatReceiptSummary | null;
}

/** One row of my_chat_unread(): a building's room at a glance. */
export type ChatRoomSummary = {
  building_id: string;
  building_name: string;
  unread: number;
  muted: boolean;
  last_message_at: string | null;
  last_preview: string | null;
  last_author: string | null;
}

/* ---------------------------------------------------------------------------
 * V033 — blocking, reporting, the store reviewers' sign-in
 * ------------------------------------------------------------------------- */

export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'other';

/** One row of my_blocked_people(). */
export type BlockedPerson = {
  profile_id: string;
  /** null for a deleted account. */
  full_name: string | null;
  blocked_at: string;
}

/** One row of chat_reports_open(): a reported message waiting for a decision. */
export type ChatReport = {
  id: string;
  building_id: string;
  building_name: string;
  message_id: string | null;
  reported_id: string | null;
  reported_name: string | null;
  reporter_name: string | null;
  reason: ReportReason;
  note: string | null;
  /** What the message said when it was reported. */
  message_body: string | null;
  had_attachment: boolean;
  /** Removed already (by its author, or another report's decision). */
  message_removed: boolean;
  created_at: string;
}

/** One place of the reviewers' demo account. */
export type ReviewPlace = {
  membership_id: string;
  building_id: string;
  building_name: string;
  role: AppRole;
  unit_label: string | null;
}

/** admin_review_access(): never the code itself. */
export type ReviewAccess = {
  enabled: boolean;
  has_code: boolean;
  code_created_at: string | null;
  profile_id: string | null;
  profile_name: string | null;
  places: ReviewPlace[];
  updated_at: string | null;
}

/* ---------------------------------------------------------------------------
 * V029 — calls and meetings
 * ------------------------------------------------------------------------- */

export type CallScope = 'direct' | 'group';
export type CallMedia = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended';
export type CallEndReason = 'completed' | 'missed' | 'declined' | 'failed';
export type CallParticipantState = 'invited' | 'joined' | 'left' | 'declined' | 'missed';
/** Who may ring someone: anyone in their buildings, only the staff, or nobody. */
export type CallPolicy = 'building' | 'staff' | 'nobody';
export type MeetingMode = 'in_person' | 'audio' | 'video';
export type MeetingResponse = 'going' | 'maybe' | 'declined';

export type CallRow = {
  id: string;
  building_id: string;
  scope: CallScope;
  media: CallMedia;
  started_by: string | null;
  meeting_id: string | null;
  status: CallStatus;
  end_reason: CallEndReason | null;
  max_participants: number;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
}

export type CallParticipantRow = {
  call_id: string;
  profile_id: string;
  state: CallParticipantState;
  invited_at: string | null;
  joined_at: string | null;
  left_at: string | null;
  last_seen_at: string | null;
}

export type CallPreferenceRow = {
  profile_id: string;
  policy: CallPolicy;
  updated_at: string;
}

export type BuildingMeetingRow = {
  id: string;
  building_id: string;
  title: string;
  agenda: string | null;
  mode: MeetingMode;
  location: string | null;
  starts_at: string;
  duration_minutes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  reminded_at: string | null;
}

export type MeetingRsvpRow = {
  meeting_id: string;
  profile_id: string;
  response: MeetingResponse;
  updated_at: string;
}

/** One person in call_info(). `live`: joined, and heard from in the last 40 seconds. */
export type CallPerson = {
  profile_id: string;
  name: string;
  role: AppRole | null;
  state: CallParticipantState;
  live: boolean;
  joined_at: string | null;
}

/** call_info(), and what call_start / call_join hand back. */
export type CallInfo = {
  id: string;
  building_id: string;
  building_name: string;
  scope: CallScope;
  media: CallMedia;
  status: CallStatus;
  end_reason: CallEndReason | null;
  started_by: string | null;
  started_by_name: string | null;
  meeting_id: string | null;
  meeting_title: string | null;
  max_participants: number;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
  live: number;
  my_state: CallParticipantState | null;
  participants: CallPerson[];
  /** call_start only: false when it walked into a room that was already open. */
  created?: boolean;
}

export type CallHeartbeat = {
  status: CallStatus;
  end_reason: CallEndReason | null;
  live?: number;
  my_state?: CallParticipantState | null;
}

/** building_live_calls(): a room open right now, for the room's Join banner. */
export type LiveRoom = {
  id: string;
  media: CallMedia;
  meeting_id: string | null;
  meeting_title: string | null;
  started_by_name: string | null;
  created_at: string;
  max_participants: number;
  live: number;
  names: string[];
  mine: boolean;
}

/** A call card in the building's room, drawn from the call's live state. */
export type ChatCallCard = {
  id: string;
  media: CallMedia;
  status: CallStatus;
  end_reason: CallEndReason | null;
  created_at: string;
  ended_at: string | null;
  live: number;
  max_participants: number;
  joined: number;
  meeting_title: string | null;
}

/** One row of my_calls(). */
export type CallHistoryRow = {
  id: string;
  building_id: string;
  building_name: string;
  scope: CallScope;
  media: CallMedia;
  outgoing: boolean;
  my_state: CallParticipantState;
  end_reason: CallEndReason | null;
  status: CallStatus;
  counterpart_id: string | null;
  counterpart_name: string | null;
  participants: number;
  meeting_title: string | null;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
}

/** call_ice_servers(): STUN, and TURN with credentials that expire. */
export type IceConfig = {
  iceServers: { urls: string[]; username?: string; credential?: string }[];
  relay: boolean;
  ttl?: number;
}

/** admin_call_settings(): everything but the TURN secret itself. */
export type AdminCallSettings = {
  stun_urls: string[];
  turn_urls: string[];
  has_secret: boolean;
  turn_ttl_seconds: number | null;
  updated_at: string | null;
}

/** meeting_summary(): a meeting as the room card and the lists draw it. */
export type MeetingSummary = {
  id: string;
  building_id: string;
  title: string;
  agenda: string | null;
  mode: MeetingMode;
  location: string | null;
  starts_at: string;
  duration_minutes: number;
  created_by: string | null;
  created_by_name: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  going: number;
  maybe: number;
  declined: number;
  my_response: MeetingResponse | null;
  live_call_id: string | null;
  live: number;
}

/** meeting_detail(): the summary, and who answered what (for the people who run the building). */
export type MeetingDetail = MeetingSummary & {
  building_name: string;
  can_manage: boolean;
  responses: { name: string; response: MeetingResponse; role: AppRole | null }[] | null;
  invited: number;
}

/* ---------------------------------------------------------------------------
 * V030 — getting back into an account, one account per person
 * ------------------------------------------------------------------------- */

/** issue_sign_in_code(): shown once, to whoever made it. */
export type SignInCodeIssued = {
  code: string;
  expires_at: string;
  full_name: string;
}

/** One account in a group of accounts that share a phone number. */
export type DuplicateAccount = {
  id: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  phone_verified: boolean;
  /** How it signs in: a real email, a phone, or neither (an invite code once). */
  email_kind: 'email' | 'phone' | 'invite' | 'none';
  email: string | null;
  operator: boolean;
  /** Can sign in on its own: a verified phone or a real email. */
  can_sign_in: boolean;
  memberships: { building_name: string; building_code: string; role: AppRole; unit_label: string | null }[];
}

export type DuplicateGroup = {
  phone: string;
  accounts: DuplicateAccount[];
}

export type MergeResult = {
  kept: string;
  removed: string;
  memberships_moved: number;
  memberships_ended: number;
}

/** What a building has paid the platform, and over how many months (V028). */
export type BuildingFeeSummary = {
  paid_minor: number;
  paid_months: number;
  waived_months: number;
  open_minor: number;
  open_months: number;
  currency: string;
  first_period: string | null;
  last_paid_at: string | null;
}

/** What building_chat_send() hands back, including who to tell. */
export type ChatSendResult = {
  id: string;
  building_id: string;
  building_name: string;
  author_name: string;
  preview: string;
  has_attachment: boolean;
  recipients: string[];
  /** V034: this send repeated one that had already arrived; nobody was told again. */
  duplicate?: boolean;
}

/** What a scanner just scanned: building_join_info(). */
export type JoinInfo = {
  building: { id: string; name: string; code: string; city: string; address: string | null };
  flats: { id: string; label: string; block: string | null; number: string; status: UnitStatus }[];
  already_member: boolean;
  open_request: { id: string; role: JoinRole; created_at: string } | null;
  my_phone: string | null;
  my_name: string | null;
}

/** One row of my_join_requests(). */
export type MyJoinRequest = {
  id: string;
  building_id: string;
  building_name: string;
  building_code: string;
  role: JoinRole;
  unit_label: string | null;
  relationship: Relationship | null;
  status: JoinRequestStatus;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
}

/** One row of join_requests_for_building(): enough to decide, and to call. */
export type BuildingJoinRequest = {
  id: string;
  profile_id: string;
  full_name: string;
  phone: string | null;
  role: JoinRole;
  unit_id: string | null;
  unit_label: string | null;
  relationship: Relationship | null;
  note: string | null;
  status: JoinRequestStatus;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by_name: string | null;
  account_since: string;
  phone_verified: boolean;
  other_buildings: number;
}

export type AdminPushPreview = { people: number; reachable: number; devices: number; online: number }

/** One row of admin_push_campaigns(). */
export type AdminPushCampaign = Pick<PushCampaignRow,
  'id' | 'title' | 'body' | 'image_url' | 'link_url' | 'screen' | 'importance' | 'audience' | 'is_test'
  | 'status' | 'recipients' | 'reachable' | 'devices' | 'push_ok' | 'push_failed' | 'created_at' | 'sent_at'> & {
  read_count: number;
  created_by_name: string | null;
}

export type AdminPushCampaignDetail = {
  campaign: PushCampaignRow;
  created_by_name: string | null;
  read_count: number;
  by_status: Partial<Record<PushStatus, number>>;
  recipients: {
    profile_id: string;
    full_name: string;
    push_status: PushStatus;
    push_error: string | null;
    read_at: string | null;
  }[];
}

export type AdminAuditEntry = {
  id: number;
  occurred_at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  building_id: string | null;
  building_name: string | null;
  actor_id: string | null;
  actor_name: string | null;
  diff: Record<string, unknown> | null;
}

export type UnitBalanceRow = {
  unit_id: string;
  building_id: string;
  block: string | null;
  number: string;
  unit_status: UnitStatus;
  outstanding_minor: number;
  billed_minor: number;
  paid_minor: number;
  credit_minor: number;
  oldest_due_date: string | null;
  days_overdue: number;
  open_invoice_count: number;
}

export type UnitResidentRow = {
  membership_id: string;
  building_id: string;
  unit_id: string | null;
  profile_id: string;
  relationship: Relationship | null;
  is_primary_contact: boolean;
  active: boolean;
  full_name: string;
  phone: string;
  preferred_language: string;
}

export type ArrearsRow = {
  unit_id: string;
  block: string | null;
  number: string;
  outstanding_minor: number;
  credit_minor: number;
  net_due_minor: number;
  days_overdue: number;
  oldest_due_date: string | null;
  open_invoice_count: number;
  primary_contact: string | null;
  primary_phone: string | null;
}

export interface RecordPaymentResult {
  payment_id: string;
  receipt_number: string;
  amount_minor: number;
  allocated_minor?: number;
  credit_minor?: number;
  idempotent: boolean;
  allocations: { invoice_id: string; amount_minor: number }[];
}

export interface DashboardResult {
  collected_minor: number;
  collected_cash_minor: number;
  outstanding_minor: number;
  units_in_arrears: number;
  unit_count: number;
  open_tickets: number;
  unread_announcement_count: number;
}

export interface ResidentHomeResult {
  outstanding_minor: number;
  credit_minor: number;
  days_overdue: number;
  next_due_date: string | null;
  open_tickets: number;
  latest_announcement: {
    id: string;
    title: string;
    published_at: string;
    category: AnnouncementCategory;
  } | null;
}

export interface SyncManifest {
  server_time: string;
  schema_version: number;
  profile_id: string;
  buildings: {
    id: string; name: string; code: string; city: string;
    currency: string; timezone: string; billing_day: number; due_days: number;
  }[];
  memberships: {
    id: string; building_id: string; role: AppRole; unit_id: string | null;
    relationship: Relationship | null; is_primary_contact: boolean;
  }[];
}

export type LedgerRow = {
  occurred_at: string;
  kind: 'invoice' | 'payment' | 'reversal';
  reference: string;
  description: string;
  debit_minor: number;
  credit_minor: number;
  entity_id: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      buildings: Table<BuildingRow>;
      units: Table<UnitRow>;
      profiles: Table<ProfileRow>;
      memberships: Table<MembershipRow>;
      charge_types: Table<ChargeTypeRow>;
      invoices: Table<InvoiceRow>;
      invoice_lines: Table<InvoiceLineRow>;
      payments: Table<PaymentRow>;
      payment_allocations: Table<PaymentAllocationRow>;
      unit_credits: Table<UnitCreditRow>;
      announcements: Table<AnnouncementRow>;
      announcement_reads: Table<AnnouncementReadRow>;
      tickets: Table<TicketRow>;
      ticket_comments: Table<TicketCommentRow>;
      visitor_passes: Table<VisitorPassRow>;
      gate_events: Table<GateEventRow>;
      invite_codes: Table<InviteCodeRow>;
      device_tokens: Table<DeviceTokenRow>;
      building_requests: Table<BuildingRequestRow>;
      platform_admins: Table<PlatformAdminRow>;
      unit_charges: Table<UnitChargeRow>;
      deleted_rows: Table<DeletedRowRow>;
      platform_announcements: Table<PlatformAnnouncementRow>;
      platform_settings: Table<PlatformSettingsRow>;
      user_presence: Table<UserPresenceRow>;
      push_campaigns: Table<PushCampaignRow>;
      notifications: Table<NotificationRow>;
      platform_answers: Table<PlatformAnswerRow>;
      operator_alerts: Table<OperatorAlertRow>;
      operator_push_subscriptions: Table<OperatorPushSubscriptionRow>;
      account_status: Table<AccountStatusRow>;
      building_qr: Table<BuildingQrRow>;
      join_requests: Table<JoinRequestRow>;
      platform_invoices: Table<PlatformInvoiceRow>;
      building_status: Table<BuildingStatusRow>;
      support_threads: Table<SupportThreadRow>;
      support_messages: Table<SupportMessageRow>;
      platform_requests: Table<PlatformRequestRow>;
      building_chat_messages: Table<BuildingChatMessageRow>;
      building_chat_reads: Table<BuildingChatReadRow>;
      building_chat_reactions: Table<BuildingChatReactionRow>;
      building_chat_pins: Table<BuildingChatPinRow>;
      calls: Table<CallRow>;
      call_participants: Table<CallParticipantRow>;
      call_preferences: Table<CallPreferenceRow>;
      building_meetings: Table<BuildingMeetingRow>;
      meeting_rsvps: Table<MeetingRsvpRow>;
      complexes: Table<ComplexRow>;
      complex_members: Table<ComplexMemberRow>;
      complex_invites: Table<ComplexInviteRow>;
    };
    Views: {
      unit_balances: { Row: UnitBalanceRow; Relationships: [] };
      unit_residents: { Row: UnitResidentRow; Relationships: [] };
    };
    Functions: {
      record_payment: {
        Args: {
          p_building_id: string;
          p_unit_id: string;
          p_amount_minor: number;
          p_method: PaymentMethod;
          p_client_id: string;
          p_receipt_year: number;
          p_received_at?: string;
          p_reference?: string | null;
          p_note?: string | null;
        };
        Returns: RecordPaymentResult;
      };
      reverse_payment: {
        Args: { p_payment_id: string; p_receipt_year: number; p_reason?: string | null };
        Returns: { reversal_payment_id: string; receipt_number: string; reversed_payment_id: string };
      };
      generate_invoices: {
        Args: {
          p_building_id: string;
          p_period_start: string;
          p_period_end: string;
          p_invoice_year: number;
          p_due_date?: string | null;
          p_publish?: boolean;
        };
        Returns: { created: number; skipped: number; period_start: string; period_end: string };
      };
      publish_invoices: {
        Args: { p_building_id: string; p_period_start: string; p_period_end: string };
        Returns: { published: number };
      };
      void_invoice: {
        Args: { p_invoice_id: string; p_reason?: string | null; p_release_payments?: boolean };
        Returns: { invoice_id: string; status: string; released_minor: number; idempotent: boolean };
      };
      // ---- V018: billing corrections -------------------------------------
      void_invoices: {
        Args: {
          p_building_id: string;
          p_period_start: string;
          p_period_end: string;
          p_scope?: VoidScope;
          p_reason?: string | null;
        };
        Returns: { voided: number; kept: number; released_minor: number };
      };
      update_invoice_lines: {
        Args: { p_invoice_id: string; p_lines: InvoiceLineInput[]; p_reason?: string | null };
        Returns: {
          mode: 'unchanged' | 'updated' | 'reissued';
          invoice_id: string;
          invoice_number: string;
          total_minor: number;
          replaced_id?: string;
          replaced_number?: string;
          moved_minor?: number;
          credit_minor?: number;
        };
      };
      recalculate_invoices: {
        Args: {
          p_building_id: string;
          p_period_start: string;
          p_period_end: string;
          p_invoice_id?: string | null;
          p_reason?: string | null;
        };
        Returns: RecalculateResult;
      };
      set_invoices_due_date: {
        Args: {
          p_building_id: string;
          p_period_start: string;
          p_period_end: string;
          p_due_date: string;
          p_invoice_id?: string | null;
        };
        Returns: { updated: number; due_date: string };
      };
      billing_period_status: {
        Args: { p_building_id: string; p_period_start: string; p_period_end: string };
        Returns: BillingPeriodStatus;
      };
      set_announcement_state: {
        Args: { p_announcement_id: string; p_state: AnnouncementState };
        Returns: { id: string; state: AnnouncementState };
      };
      // ---- V032: one notice, many buildings --------------------------------
      create_announcement_batch: {
        Args: {
          p_building_ids: string[];
          p_title: string;
          p_body: string;
          p_category?: AnnouncementCategory;
          p_pinned?: boolean;
          p_expires_at?: string | null;
          p_publish?: boolean;
        };
        Returns: { batch_id: string; count: number; published: boolean };
      };
      update_announcement_batch: {
        Args: {
          p_batch_id: string;
          p_title: string;
          p_body: string;
          p_category: AnnouncementCategory;
          p_pinned: boolean;
          p_expires_at?: string | null;
        };
        Returns: { batch_id: string; count: number };
      };
      set_announcement_batch_state: {
        Args: { p_batch_id: string; p_state: AnnouncementState };
        Returns: { batch_id: string; state: AnnouncementState; count: number };
      };
      end_membership: {
        Args: { p_membership_id: string };
        Returns: EndMembershipResult;
      };
      update_membership: {
        Args: {
          p_membership_id: string;
          p_role: AppRole;
          p_unit_id?: string | null;
          p_relationship?: Relationship | null;
          p_is_primary_contact?: boolean;
        };
        Returns: {
          id: string; role: AppRole; unit_id: string | null;
          relationship: Relationship | null; is_primary_contact: boolean; self: boolean;
        };
      };
      add_membership: {
        Args: {
          p_building_id: string;
          p_profile_id: string;
          p_role: AppRole;
          p_unit_id?: string | null;
          p_relationship?: Relationship | null;
        };
        Returns: { id: string; role: AppRole; unit_id: string | null };
      };
      set_contact_phone: {
        Args: { p_phone: string };
        Returns: string;
      };
      arrears_report: {
        Args: { p_building_id: string; p_min_days_overdue?: number };
        Returns: ArrearsRow[];
      };
      building_dashboard: {
        Args: { p_building_id: string; p_from: string; p_to: string };
        Returns: DashboardResult;
      };
      unit_ledger: {
        Args: { p_unit_id: string; p_limit?: number };
        Returns: LedgerRow[];
      };
      resident_home: {
        Args: { p_unit_id: string };
        Returns: ResidentHomeResult;
      };
      sync_manifest: {
        Args: Record<string, never>;
        Returns: SyncManifest;
      };
      // ---- V031: complexes -----------------------------------------------
      request_complex: {
        Args: {
          p_name: string;
          p_code: string;
          p_city: string;
          p_building_count: number;
          p_unit_count: number;
          p_requester_role: RequesterRole;
          p_district?: string | null;
          p_address?: string | null;
          p_note?: string | null;
        };
        Returns: { id: string; status: BuildingRequestStatus; kind: 'complex'; building_code: string };
      };
      my_complexes: {
        Args: Record<string, never>;
        Returns: MyComplex[];
      };
      complex_add_buildings: {
        Args: { p_complex_id: string; p_buildings: ComplexBuildingInput[]; p_template_building_id?: string | null };
        Returns: {
          complex_id: string;
          buildings: { id: string; name: string; code: string; units: number; charges: number }[];
        };
      };
      complex_attach_building: {
        Args: { p_complex_id: string; p_building_id: string };
        Returns: { complex_id: string; building_id: string; already: boolean };
      };
      complex_detach_building: {
        Args: { p_complex_id: string; p_building_id: string };
        Returns: { complex_id: string; building_id: string };
      };
      complex_update: {
        Args: {
          p_complex_id: string;
          p_name: string;
          p_city: string;
          p_address?: string | null;
          p_billing_day?: number | null;
          p_due_days?: number | null;
        };
        Returns: { id: string };
      };
      complex_create_invite: {
        Args: {
          p_complex_id: string;
          p_role: ComplexRole;
          p_building_ids?: string[] | null;
          p_full_name?: string | null;
          p_max_uses?: number;
        };
        Returns: {
          id: string; code: string; role: ComplexRole; building_ids: string[] | null;
          expires_at: string; max_uses: number;
        };
      };
      complex_revoke_invite: {
        Args: { p_invite_id: string };
        Returns: { id: string };
      };
      complex_update_member: {
        Args: { p_member_id: string; p_role: ComplexRole; p_building_ids?: string[] | null };
        Returns: { id: string; role: ComplexRole; building_ids: string[] | null };
      };
      complex_remove_member: {
        Args: { p_member_id: string };
        Returns: { id: string; self: boolean };
      };
      complex_office: {
        Args: { p_complex_id: string };
        Returns: ComplexOffice;
      };
      complex_copy_charges: {
        Args: { p_complex_id: string; p_from_building: string; p_to_buildings: string[] };
        Returns: { created: number };
      };
      // ---- V017: in-app management -------------------------------------
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      add_units_bulk: {
        Args: {
          p_building_id: string;
          p_blocks: string[];
          p_floor_from: number;
          p_floor_to: number;
          p_per_floor: number;
          p_area_sqm?: number | null;
          p_status?: UnitStatus;
        };
        Returns: { planned: number; created: number; skipped: number };
      };
      archive_unit: {
        Args: { p_unit_id: string };
        Returns: { id: string; archived: boolean };
      };
      request_building: {
        Args: {
          p_name: string;
          p_code: string;
          p_city: string;
          p_unit_count: number;
          p_requester_role: RequesterRole;
          p_district?: string | null;
          p_address?: string | null;
          p_note?: string | null;
        };
        Returns: { id: string; status: BuildingRequestStatus; building_code: string };
      };
      cancel_building_request: {
        Args: { p_request_id: string };
        Returns: { id: string; status: BuildingRequestStatus };
      };
      review_building_request: {
        Args: {
          p_request_id: string;
          p_approve: boolean;
          p_note?: string | null;
          p_code?: string | null;
          p_billing_day?: number;
          p_due_days?: number;
        };
        Returns: {
          id: string; status: BuildingRequestStatus; kind?: BuildingRequestKind;
          building_id?: string; building_code?: string; complex_id?: string; complex_code?: string;
        };
      };
      admin_building_requests: {
        Args: { p_status?: BuildingRequestStatus | 'all' };
        Returns: AdminBuildingRequest[];
      };
      admin_platform_stats: {
        Args: Record<string, never>;
        Returns: AdminPlatformStats;
      };
      admin_building_detail: {
        Args: { p_building_id: string };
        Returns: AdminBuildingDetail;
      };
      admin_update_building: {
        Args: {
          p_building_id: string; p_name: string; p_code: string; p_city: string;
          p_address: string | null; p_billing_day: number; p_due_days: number;
        };
        Returns: { id: string; code: string };
      };
      admin_set_building_active: {
        /** A reason is required when closing a building: its people are shown it. */
        Args: { p_building_id: string; p_active: boolean; p_reason?: string | null };
        Returns: { id: string; active: boolean };
      };
      admin_delete_building: {
        Args: { p_building_id: string };
        Returns: { id: string; deleted: boolean };
      };
      admin_enter_building: {
        Args: { p_building_id: string };
        Returns: { membership_id: string; building_id: string };
      };
      admin_users: {
        Args: {
          p_search?: string | null; p_limit?: number; p_offset?: number;
          p_presence?: 'online' | 'offline' | 'never' | null;
          p_seen_after?: string | null; p_seen_before?: string | null;
          p_order?: 'joined' | 'seen';
        };
        Returns: AdminUser[];
      };
      touch_presence: {
        Args: { p_foreground?: boolean; p_platform?: string | null; p_app_version?: string | null };
        Returns: undefined;
      };
      // ---- V037: installs, alerts, authenticators ---------------------------------------
      report_app_install: {
        Args: {
          p_install_id: string; p_platform: string;
          p_app_version?: string | null; p_build_number?: string | null; p_runtime_version?: string | null;
          p_update_id?: string | null; p_update_created_at?: string | null; p_channel?: string | null;
          p_os_version?: string | null; p_device_model?: string | null; p_device_brand?: string | null;
          p_locale?: string | null; p_push_token?: string | null;
        };
        Returns: undefined;
      };
      admin_app_installs: { Args: { p_limit?: number }; Returns: AdminAppInstall[] };
      admin_app_versions: { Args: Record<string, never>; Returns: AdminAppVersion[] };
      admin_mfa_status: { Args: { p_profile_id: string }; Returns: { verified: number; unverified: number } };
      operator_push_subscribe: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_language?: string; p_user_agent?: string | null };
        Returns: string;
      };
      operator_push_unsubscribe: { Args: { p_endpoint: string }; Returns: undefined };
      admin_test_alert: { Args: Record<string, never>; Returns: string };
      register_device: {
        Args: {
          p_token: string; p_platform: string; p_app_version?: string | null; p_locale?: string | null;
          /** V036: SHA-256 (hex) of this phone's notification key. */
          p_action_key_hash?: string | null;
        };
        Returns: undefined;
      };
      // ---- V036: answers ------------------------------------------------------------
      platform_answer: {
        Args: {
          p_announcement_id?: string | null;
          p_campaign_id?: string | null;
          p_choice?: number | null;
          p_answer?: string | null;
          p_via?: 'app' | 'notification';
        };
        Returns: Pick<PlatformAnswerRow, 'id' | 'choice' | 'answer' | 'via' | 'updated_at'>;
      };
      admin_platform_answers: {
        Args: { p_announcement_id?: string | null; p_campaign_id?: string | null };
        Returns: AdminPlatformAnswers;
      };
      mark_notifications_read: {
        Args: { p_ids?: string[] | null };
        Returns: number;
      };
      admin_push_preview: {
        Args: { p_audience: PushAudience };
        Returns: AdminPushPreview;
      };
      admin_push_campaigns: {
        Args: { p_limit?: number; p_before?: string | null };
        Returns: AdminPushCampaign[];
      };
      admin_push_campaign: {
        Args: { p_campaign_id: string };
        Returns: AdminPushCampaignDetail;
      };
      admin_delete_push_campaign: {
        Args: { p_campaign_id: string };
        Returns: { id: string };
      };
      admin_user_detail: {
        Args: { p_profile_id: string };
        Returns: AdminUserDetail;
      };
      admin_update_user: {
        Args: { p_profile_id: string; p_full_name: string; p_phone?: string | null };
        Returns: { profile_id: string };
      };
      admin_set_platform_admin: {
        Args: { p_profile_id: string; p_grant: boolean };
        Returns: { profile_id: string; operator: boolean };
      };
      admin_end_membership: {
        Args: { p_membership_id: string };
        Returns: { membership_id: string };
      };
      admin_revoke_invite: {
        Args: { p_invite_id: string };
        Returns: { id: string };
      };
      admin_audit_log: {
        Args: {
          p_building_id?: string | null; p_before?: number | null; p_limit?: number;
          p_search?: string | null; p_from?: string | null; p_to?: string | null;
          p_areas?: string[] | null;
        };
        Returns: AdminAuditEntry[];
      };
      building_join_info: {
        Args: { p_code: string; p_token: string };
        Returns: JoinInfo;
      };
      request_join: {
        Args: {
          p_code: string; p_token: string; p_role: JoinRole; p_unit_id?: string | null;
          p_relationship?: string | null; p_full_name?: string | null; p_phone?: string | null;
          p_note?: string | null;
        };
        Returns: { request_id: string; building_id: string; building_name: string; role: JoinRole; staff: string[] };
      };
      cancel_join_request: {
        Args: { p_request_id: string };
        Returns: { id: string; status: JoinRequestStatus };
      };
      my_join_requests: {
        Args: Record<string, never>;
        Returns: MyJoinRequest[];
      };
      join_requests_for_building: {
        Args: { p_building_id: string; p_status?: string | null };
        Returns: BuildingJoinRequest[];
      };
      review_join_request: {
        Args: { p_request_id: string; p_approve: boolean; p_note?: string | null };
        Returns: {
          request_id: string; status: JoinRequestStatus; profile_id: string;
          building_id: string; building_name: string; role: JoinRole; membership_id: string | null;
        };
      };
      building_chat_send: {
        Args: {
          p_building_id: string; p_body?: string | null; p_attachment_path?: string | null;
          p_attachment_type?: string | null; p_attachment_size?: number | null;
          p_attachment_duration_ms?: number | null;
          /** V034: the phone's own id for it; a repeat is answered with the same message. */
          p_id?: string | null;
          /** V034: the message this one answers. */
          p_reply_to?: string | null;
        };
        Returns: ChatSendResult;
      };
      // ---- V034: the room works like a messenger ----------------------------
      building_chat_edit: {
        Args: { p_message_id: string; p_body: string };
        Returns: { id: string; body: string | null; edited_at: string | null };
      };
      building_chat_react: {
        Args: { p_message_id: string; p_emoji?: string | null };
        Returns: { message_id: string; emoji: string | null };
      };
      building_chat_mark_delivered: {
        Args: Record<string, never>;
        Returns: number;
      };
      building_chat_receipts: {
        Args: { p_message_id: string };
        Returns: ChatReceiptRow[];
      };
      // ---- V035: pinned messages ----------------------------------------------
      building_chat_pin: {
        Args: { p_message_id: string; p_days: number };
        /** `replaced`: the message whose pin this one took the place of (three at most). */
        Returns: { message_id: string; expires_at: string; replaced: string | null };
      };
      building_chat_unpin: {
        Args: { p_message_id: string };
        Returns: { message_id: string; unpinned: boolean };
      };
      building_chat_pins: {
        Args: { p_building_id: string };
        Returns: ChatPin[];
      };
      building_chat_delete: {
        Args: { p_message_id: string };
        /** V034: `attachment_path` is the removed file, for the caller to delete from storage. */
        Returns: { id: string; building_id: string; attachment_path?: string | null };
      };
      building_chat_history: {
        Args: { p_building_id: string; p_before?: string | null; p_limit?: number };
        Returns: ChatMessage[];
      };
      building_chat_mark_read: {
        Args: { p_building_id: string };
        Returns: undefined;
      };
      /** V038: the room is off the caller's screen, so the next message pushes. */
      building_chat_unwatch: {
        Args: { p_building_id: string };
        Returns: undefined;
      };
      building_chat_mute: {
        Args: { p_building_id: string; p_muted: boolean };
        Returns: undefined;
      };
      my_chat_unread: {
        Args: Record<string, never>;
        Returns: ChatRoomSummary[];
      };
      // ---- V033: ready for the stores --------------------------------------
      block_user: { Args: { p_profile_id: string }; Returns: { blocked: string } };
      unblock_user: { Args: { p_profile_id: string }; Returns: { unblocked: string } };
      my_blocked_people: { Args: Record<string, never>; Returns: BlockedPerson[] };
      report_chat_message: {
        Args: { p_message_id: string; p_reason: ReportReason; p_note?: string | null };
        Returns: { id: string | null; already: boolean; building_id: string; building_name: string; recipients: string[] };
      };
      chat_reports_open: { Args: Record<string, never>; Returns: ChatReport[] };
      resolve_chat_report: {
        Args: { p_report_id: string; p_action: 'remove' | 'keep' };
        Returns: {
          id: string; status: 'open' | 'removed' | 'kept'; reports?: number; already?: boolean;
          /** V034: a removed message's file, for the caller to delete from storage. */
          attachment_path?: string | null;
        };
      };
      admin_review_access: { Args: Record<string, never>; Returns: ReviewAccess };
      admin_set_review_access: {
        Args: { p_enabled: boolean; p_new_code?: boolean };
        Returns: ReviewAccess & { code: string | null };
      };
      admin_review_add_place: {
        Args: { p_building_id: string; p_role: AppRole; p_unit_id?: string | null };
        Returns: ReviewPlace[];
      };
      admin_review_remove_place: { Args: { p_membership_id: string }; Returns: ReviewPlace[] };
      call_join: { Args: { p_call_id: string }; Returns: CallInfo };
      call_info: { Args: { p_call_id: string }; Returns: CallInfo };
      call_decline: {
        Args: { p_call_id: string };
        Returns: { call_id: string; started_by: string | null };
      };
      call_heartbeat: { Args: { p_call_id: string }; Returns: CallHeartbeat };
      my_ringing_call: { Args: Record<string, never>; Returns: CallInfo | null };
      building_live_calls: { Args: { p_building_id: string }; Returns: LiveRoom[] };
      my_calls: { Args: { p_limit?: number }; Returns: CallHistoryRow[] };
      my_call_policy: { Args: Record<string, never>; Returns: CallPolicy };
      set_call_policy: { Args: { p_policy: CallPolicy }; Returns: CallPolicy };
      call_ice_servers: { Args: Record<string, never>; Returns: IceConfig };
      admin_call_settings: { Args: Record<string, never>; Returns: AdminCallSettings };
      admin_set_call_settings: {
        Args: {
          p_stun_urls: string[]; p_turn_urls: string[];
          p_turn_secret?: string | null; p_clear_secret?: boolean;
        };
        Returns: AdminCallSettings;
      };
      building_meetings_list: {
        Args: { p_building_id: string; p_upcoming?: boolean };
        Returns: MeetingSummary[];
      };
      meeting_detail: { Args: { p_meeting_id: string }; Returns: MeetingDetail };
      meeting_rsvp: {
        Args: { p_meeting_id: string; p_response: MeetingResponse };
        Returns: MeetingSummary;
      };
      issue_sign_in_code: {
        Args: { p_profile_id: string; p_building_id?: string | null };
        Returns: SignInCodeIssued;
      };
      admin_duplicate_accounts: { Args: Record<string, never>; Returns: DuplicateGroup[] };
      admin_merge_accounts: { Args: { p_keep: string; p_remove: string }; Returns: MergeResult };
      support_start: {
        Args: {
          p_subject: string; p_body: string | null; p_topic?: SupportTopic;
          p_building_id?: string | null; p_attachment_path?: string | null;
          p_attachment_type?: string | null; p_attachment_size?: number | null;
          p_attachment_duration_ms?: number | null;
        };
        Returns: { thread_id: string; subject: string };
      };
      support_send: {
        Args: {
          p_thread_id: string; p_body?: string | null; p_attachment_path?: string | null;
          p_attachment_type?: string | null; p_attachment_size?: number | null;
          p_attachment_duration_ms?: number | null;
        };
        Returns: {
          thread_id: string; from_staff: boolean; claimed: boolean;
          profile_id: string; assigned_to: string | null; subject: string;
          /** V028: true when they were watching it arrive, so do not tell them. */
          recipient_watching: boolean;
        };
      };
      support_claim: {
        Args: { p_thread_id: string };
        Returns: { thread_id: string; assigned_to: string; profile_id: string };
      };
      support_transfer: {
        Args: { p_thread_id: string; p_to: string; p_note?: string | null };
        Returns: { thread_id: string; assigned_to: string; profile_id: string };
      };
      support_close: {
        Args: { p_thread_id: string; p_resolved?: boolean };
        Returns: { thread_id: string; profile_id: string; status: SupportStatus };
      };
      support_mark_read: {
        Args: { p_thread_id: string };
        Returns: undefined;
      };
      /** V038: the thread is off the caller's screen (their side only), so the next reply pushes. */
      support_unwatch: {
        Args: { p_thread_id: string };
        Returns: undefined;
      };
      my_support_threads: {
        Args: Record<string, never>;
        Returns: MySupportThread[];
      };
      my_support_unread: {
        Args: Record<string, never>;
        Returns: number;
      };
      support_thread: {
        Args: { p_thread_id: string };
        Returns: SupportThreadDetail;
      };
      admin_support_threads: {
        Args: { p_scope?: 'queue' | 'mine' | 'all' | 'closed' };
        Returns: AdminSupportThread[];
      };
      admin_support_counts: {
        Args: Record<string, never>;
        Returns: SupportCounts;
      };
      admin_operators: {
        Args: Record<string, never>;
        Returns: OperatorSummary[];
      };
      submit_platform_request: {
        Args: {
          p_kind: PlatformRequestKind; p_title: string; p_body: string;
          p_category?: PlatformRequestCategory; p_building_id?: string | null;
          p_attachment_path?: string | null; p_attachment_type?: string | null;
        };
        Returns: { id: string; kind: PlatformRequestKind; title: string };
      };
      my_platform_requests: {
        Args: { p_kind?: PlatformRequestKind | 'all' | null };
        Returns: PlatformRequestRow[];
      };
      admin_platform_requests: {
        Args: {
          p_kind?: PlatformRequestKind | 'all';
          p_status?: PlatformRequestStatus | 'open' | 'all';
          p_search?: string | null;
        };
        Returns: AdminPlatformRequest[];
      };
      admin_update_platform_request: {
        Args: {
          p_id: string; p_status: PlatformRequestStatus;
          p_target_date?: string | null; p_note?: string | null;
        };
        Returns: {
          id: string; kind: PlatformRequestKind; title: string;
          profile_id: string; status: PlatformRequestStatus; changed: boolean;
        };
      };
      admin_request_counts: {
        Args: Record<string, never>;
        Returns: RequestCounts;
      };
      my_building_billing: {
        Args: Record<string, never>;
        Returns: MyBuildingBilling[];
      };
      building_fee_history: {
        Args: { p_building_id: string; p_limit?: number };
        Returns: PlatformInvoiceRow[];
      };
      admin_platform_billing: {
        Args: { p_status?: 'all' | 'unpaid' | 'paid' | 'overdue' };
        Returns: AdminBuildingBilling[];
      };
      admin_mark_fee_paid: {
        Args: { p_invoice_id: string; p_method?: PlatformFeeMethod; p_note?: string | null };
        Returns: { id: string; building_id: string; reopened: boolean };
      };
      admin_waive_fee: {
        Args: { p_invoice_id: string; p_note?: string | null };
        Returns: { id: string; building_id: string };
      };
      admin_unmark_fee_paid: {
        Args: { p_invoice_id: string; p_reason: string };
        Returns: {
          id: string; building_id: string;
          was: PlatformInvoiceStatus; closed: boolean;
        };
      };
      building_fee_summary: {
        Args: { p_building_id: string };
        Returns: BuildingFeeSummary;
      };
      admin_billing_run: {
        Args: Record<string, never>;
        Returns: BillingRunResult;
      };
      rotate_building_qr: {
        Args: { p_building_id: string };
        Returns: { building_id: string; token: string };
      };
      admin_buildings: {
        Args: Record<string, never>;
        Returns: AdminBuilding[];
      };
      onboard_building: {
        Args: {
          p_name: string;
          p_code: string;
          p_city?: string;
          p_billing_day?: number;
          p_due_days?: number;
          p_address?: string | null;
          p_manager_name?: string | null;
          p_manager_phone?: string | null;
          p_invite_valid_days?: number;
        };
        Returns: { building_id: string; building_code: string; manager_invite_code: string; invite_expires_at: string };
      };
      issue_invite: {
        Args: {
          p_building_code: string;
          p_role: AppRole;
          p_unit_number?: string | null;
          p_block?: string | null;
          p_max_uses?: number;
          p_valid_days?: number;
        };
        Returns: { invite_code: string; role: AppRole; building: string; flat: string; max_uses: number; expires_at: string };
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
