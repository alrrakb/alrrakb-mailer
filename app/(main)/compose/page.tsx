"use client";

import ComposeWindow from '@/components/email/ComposeWindow';
import { usePermissions } from '@/hooks/usePermissions';
import { UnauthorizedState } from '@/components/shared/UnauthorizedState';

export default function ComposePage() {
    const { hasAccess } = usePermissions();

    if (!hasAccess('compose')) {
        return <UnauthorizedState />;
    }

    return <ComposeWindow />;
}
