// Copied from the Manzel app (src/features/building/api.ts, errorKey) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

/** Server message or code → translation key. */
export function errorKey(message: string | undefined, code?: string): string {
  const text = message ?? '';
  const known: Record<string, string> = {
    request_signed_out: 'manage.errors.signedOut',
    request_phone_unverified: 'manage.errors.phoneUnverified',
    request_already_open: 'manage.errors.alreadyOpen',
    request_rate_limited: 'manage.errors.rateLimited',
    request_code_invalid: 'manage.errors.codeInvalid',
    request_code_taken: 'manage.errors.codeTaken',
    request_invalid: 'manage.errors.invalid',
    request_not_open: 'manage.errors.notOpen',
    review_forbidden: 'manage.errors.forbidden',
    units_bulk_invalid: 'manage.errors.bulkInvalid',
    units_bulk_too_many: 'manage.errors.bulkTooMany',
    unit_not_found: 'manage.errors.unitNotFound',
    unit_has_balance: 'manage.errors.unitHasBalance',
    unit_has_residents: 'manage.errors.unitHasResidents',
    building_field_locked: 'manage.errors.fieldLocked',
    // V018: billing corrections, per-flat charges, profiles
    invoice_forbidden: 'manage.errors.forbidden',
    invoice_not_found: 'manage.errors.invoiceNotFound',
    invoice_has_payments: 'manage.errors.invoiceHasPayments',
    invoice_void: 'manage.errors.invoiceVoid',
    invoice_lines_empty: 'manage.errors.invoiceLinesEmpty',
    invoice_lines_invalid: 'manage.errors.invoiceLinesInvalid',
    invoice_scope_invalid: 'manage.errors.invalid',
    invoice_due_date_invalid: 'manage.errors.dueDateInvalid',
    unit_charge_mismatch: 'manage.errors.invalid',
    unit_charges_dates_ordered: 'manage.errors.datesOrder',
    profile_field_locked: 'manage.errors.fieldLocked',
    profiles_full_name_shape: 'manage.errors.nameInvalid',
    // V020: notices, leaving a building
    announcement_forbidden: 'manage.errors.forbidden',
    announcement_not_found: 'notices.errors.notFound',
    announcement_state_invalid: 'manage.errors.invalid',
    membership_forbidden: 'manage.errors.forbidden',
    membership_not_found: 'leave.errors.notFound',
    membership_last_manager: 'leave.errors.lastManager',
    // V031: a role the complex office gives is changed in the office
    membership_from_complex: 'complex.errors.fromOffice',
    // V021: managing people, contact phone
    membership_exists: 'people.errors.exists',
    membership_unit_invalid: 'people.errors.unitInvalid',
    membership_relationship_invalid: 'manage.errors.invalid',
    membership_role_invalid: 'manage.errors.invalid',
    membership_not_member: 'people.errors.notMember',
    profile_phone_verified: 'profile.errors.phoneVerified',
    profile_phone_invalid: 'profile.errors.phoneInvalid',
    profile_forbidden: 'manage.errors.forbidden',
    // V022: the operator control panel
    admin_forbidden: 'manage.errors.forbidden',
    admin_not_found: 'admin.errors.notFound',
    admin_invalid: 'manage.errors.invalid',
    admin_code_in_use: 'admin.errors.codeInUse',
    admin_building_has_records: 'admin.errors.buildingHasRecords',
    admin_last_operator: 'admin.errors.lastOperator',
    request_closed: 'manage.errors.requestsClosed',
    // V024: joining a building by QR
    join_qr_invalid: 'join.errors.qrInvalid',
    join_already_member: 'join.errors.alreadyMember',
    join_already_open: 'join.errors.alreadyOpen',
    join_rate_limited: 'join.errors.rateLimited',
    join_phone_required: 'join.errors.phoneRequired',
    join_role_invalid: 'manage.errors.invalid',
    join_reason_required: 'join.errors.reasonRequired',
    join_not_found: 'join.errors.notFound',
    join_forbidden: 'manage.errors.forbidden',
    join_signed_out: 'manage.errors.signedOut',
    // V027: the building's room
    chat_empty: 'chat.errors.empty',
    chat_forbidden: 'chat.errors.forbidden',
    chat_rate_limited: 'chat.errors.rateLimited',
    chat_not_found: 'chat.errors.notFound',
    chat_too_late: 'chat.errors.tooLate',
    // V034: the room works like a messenger
    chat_conflict: 'chat.errors.notSent',
    chat_reply_invalid: 'chat.errors.replyInvalid',
    chat_edit_too_late: 'chat.errors.editTooLate',
    chat_too_long: 'chat.errors.tooLong',
    chat_reaction_invalid: 'chat.errors.reactionInvalid',
    // V035: pinned messages
    chat_pin_duration: 'chat.errors.pinDuration',
    // V028: undoing a platform-fee mark
    fee_reason_required: 'admin.billing.undoReasonRequired',
    fee_not_found: 'admin.errors.notFound',
    fee_already_open: 'admin.billing.alreadyOpen',
    // V025: the platform fee
    fee_not_open: 'admin.errors.notFound',
    building_reason_required: 'admin.building.suspendReasonRequired',
    // V026: support chat, feature requests, reports
    support_subject_required: 'support.errors.subjectRequired',
    support_body_required: 'support.errors.bodyRequired',
    support_too_many_open: 'support.errors.tooManyOpen',
    support_rate_limited: 'support.errors.rateLimited',
    support_not_found: 'support.errors.notFound',
    support_forbidden: 'manage.errors.forbidden',
    support_not_yours: 'support.errors.notYours',
    support_already_claimed: 'support.errors.alreadyClaimed',
    support_transfer_self: 'support.errors.transferSelf',
    support_not_operator: 'support.errors.notOperator',
    request_kind_invalid: 'manage.errors.invalid',
    request_too_short: 'ideas.errors.tooShort',
    // request_rate_limited is already mapped above, for building requests:
    // the same sentence fits either, so it stays one entry.
    request_not_found: 'ideas.errors.notFound',
    request_status_invalid: 'manage.errors.invalid',
    request_reason_required: 'ideas.errors.reasonRequired',
    not_signed_in: 'manage.errors.signedOut',
    // V030: sign-in codes and merging duplicate accounts
    signin_code_forbidden: 'recovery.errors.forbidden',
    signin_code_self: 'recovery.errors.self',
    signin_code_not_found: 'recovery.errors.notFound',
    signin_code_rate_limited: 'recovery.errors.rateLimited',
    merge_self: 'duplicates.errors.self',
    merge_operator: 'duplicates.errors.operator',
    merge_incomplete: 'duplicates.errors.incomplete',
    merge_not_found: 'duplicates.errors.invalid',
    merge_invalid: 'duplicates.errors.invalid',
    // V029: calls and meetings
    call_invalid: 'calls.errors.invalid',
    call_forbidden: 'calls.errors.forbidden',
    call_rate_limited: 'calls.errors.rateLimited',
    call_not_allowed: 'calls.errors.notAllowed',
    call_busy: 'calls.errors.busy',
    call_not_found: 'calls.errors.notFound',
    call_ended: 'calls.errors.ended',
    call_full: 'calls.errors.full',
    call_settings_invalid: 'calls.admin.invalid',
    call_secret_invalid: 'calls.admin.secretInvalid',
    meeting_forbidden: 'meetings.errors.forbidden',
    meeting_title_required: 'meetings.errors.titleRequired',
    meeting_place_required: 'meetings.errors.placeRequired',
    meeting_time_invalid: 'meetings.errors.timeInvalid',
    meeting_rate_limited: 'meetings.errors.rateLimited',
    meeting_not_found: 'meetings.errors.notFound',
    meeting_cancelled: 'meetings.errors.cancelled',
    meeting_over: 'meetings.errors.over',
    meeting_not_open: 'meetings.errors.notOpen',
    meeting_in_person: 'meetings.errors.inPerson',
    meeting_reason_required: 'meetings.errors.reasonRequired',
    meeting_invalid: 'meetings.errors.invalid',
    // V033: blocking, reporting, deleting your account
    block_invalid: 'safety.errors.invalid',
    block_not_found: 'safety.errors.notFound',
    block_rate_limited: 'safety.errors.rateLimited',
    report_invalid: 'safety.errors.invalid',
    report_own: 'safety.errors.own',
    report_rate_limited: 'safety.errors.rateLimited',
    report_not_found: 'safety.errors.reportNotFound',
    report_forbidden: 'manage.errors.forbidden',
    account_operator: 'accountDelete.errors.operator',
    account_last_office_manager: 'accountDelete.errors.lastOfficeManager',
    account_last_manager: 'accountDelete.errors.lastManager',
    review_no_account: 'reviewAccess.errors.noAccount',
    review_role_invalid: 'reviewAccess.errors.role',
    review_building_invalid: 'reviewAccess.errors.building',
    review_unit_invalid: 'reviewAccess.errors.unit',
    review_place_not_found: 'reviewAccess.errors.place',
  };
  for (const [serverCode, key] of Object.entries(known)) {
    if (text.includes(serverCode)) return key;
  }
  if (code === '23505' || text.includes('duplicate key')) return 'manage.errors.duplicate';
  if (code === '42501' || text.includes('row-level security') || text.includes('permission denied')) {
    return 'manage.errors.forbidden';
  }
  if (text.includes('check constraint')) return 'manage.errors.invalid';
  if (/network|fetch|timeout/i.test(text)) return 'errors.network';
  return 'errors.generic';
}
