'use client';

/**
 * An audience in words — "Everyone", "12 people", "Not seen for 24 hours",
 * with the role it was narrowed to (the app's features/admin/audience.ts),
 * and from V037 the apps ("Android · older than 1.0.0 (15)").
 * The composer, the list and the report all say it the same way.
 */

import { useCallback } from 'react';

import { useTargetLabel } from '@/components/content/apps-target';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import type { PushAudience } from '@/lib/supabase/database.types';

export function useAudienceLabel() {
  const t = useT();
  const fmt = useFormat();
  const targetLabel = useTargetLabel();

  return useCallback((audience: PushAudience): string => {
    const base = audience.mode === 'selected'
      ? t('admin.push.audience.selectedCount', { n: fmt.number(audience.profileIds?.length ?? 0) })
      : audience.mode === 'inactive'
        ? t('admin.push.audience.inactiveFor', { hours: fmt.number(audience.inactiveHours ?? 24) })
        : t(`admin.push.audience.${audience.mode}`);
    const role = audience.role ? t(`admin.banner.audience.${audience.role}`) : null;
    // V037: some apps only.
    return [base, role, targetLabel(audience.apps)].filter(Boolean).join(' · ');
  }, [t, fmt, targetLabel]);
}
