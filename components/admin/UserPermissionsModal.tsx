import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Mail, Edit3, ListOrdered, History, Building2 } from 'lucide-react';
import { UserPermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface UserPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
    userName?: string;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
    pages: { inbox: true, compose: true, queue: true, history: true, hotels: true },
    actions: {
        inbox_delete: false,
        compose_attach: false,
        compose_html: false,
        queue_delete: false,
        queue_send: false,
        history_delete: false,
        hotels_add: false,
        hotels_edit: false,
        hotels_delete: false
    }
};

export default function UserPermissionsModal({ isOpen, onClose, userId, userName }: UserPermissionsModalProps) {
    const { dict, dir } = useLanguage();
    const p = dict.permissions;

    const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchPermissions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?userId=${userId}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || p.load_error);
            }
            const data = await res.json();
            if (data.permissions) {
                setPermissions({
                    pages: { ...DEFAULT_PERMISSIONS.pages, ...(data.permissions.pages || {}) },
                    actions: { ...DEFAULT_PERMISSIONS.actions, ...(data.permissions.actions || {}) }
                });
            } else {
                setPermissions(DEFAULT_PERMISSIONS);
            }
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : p.load_error);
        } finally {
            setLoading(false);
        }
    }, [userId, p.load_error]);

    useEffect(() => {
        if (isOpen && userId) fetchPermissions();
    }, [isOpen, userId, fetchPermissions]);

    const savePermissions = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, permissions })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || p.save_error);
            toast.success(p.saved);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : p.save_error);
        } finally {
            setSaving(false);
        }
    };

    const handlePageToggle = (page: keyof UserPermissions['pages']) =>
        setPermissions(prev => ({ ...prev, pages: { ...prev.pages, [page]: !prev.pages[page] } }));

    const handleActionToggle = (action: keyof UserPermissions['actions']) =>
        setPermissions(prev => ({ ...prev, actions: { ...prev.actions, [action]: !prev.actions[action] } }));

    if (!userId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" dir={dir}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <ShieldCheck className="w-6 h-6 text-indigo-500" />
                        {p.title}
                    </DialogTitle>
                    <DialogDescription>
                        {p.desc} {userName || p.this_user}.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">

                        {/* Inbox */}
                        <div className="space-y-4 border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/10">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-gray-500" />
                                    <Label className="font-semibold text-lg">{p.inbox_page}</Label>
                                </div>
                                <Switch checked={permissions.pages.inbox} onCheckedChange={() => handlePageToggle('inbox')} />
                            </div>
                            <div className="ps-7 space-y-3 opacity-90">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('inbox_delete')}>{p.delete_emails}</Label>
                                    <Switch disabled={!permissions.pages.inbox} checked={permissions.actions.inbox_delete} onCheckedChange={() => handleActionToggle('inbox_delete')} />
                                </div>
                            </div>
                        </div>

                        {/* Compose */}
                        <div className="space-y-4 border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/10">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <Edit3 className="w-5 h-5 text-gray-500" />
                                    <Label className="font-semibold text-lg">{p.compose_page}</Label>
                                </div>
                                <Switch checked={permissions.pages.compose} onCheckedChange={() => handlePageToggle('compose')} />
                            </div>
                            <div className="ps-7 space-y-3 opacity-90">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('compose_attach')}>{p.attach_docs}</Label>
                                    <Switch disabled={!permissions.pages.compose} checked={permissions.actions.compose_attach} onCheckedChange={() => handleActionToggle('compose_attach')} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('compose_html')}>{p.html_editor}</Label>
                                    <Switch disabled={!permissions.pages.compose} checked={permissions.actions.compose_html} onCheckedChange={() => handleActionToggle('compose_html')} />
                                </div>
                            </div>
                        </div>

                        {/* Queue */}
                        <div className="space-y-4 border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/10">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <ListOrdered className="w-5 h-5 text-gray-500" />
                                    <Label className="font-semibold text-lg">{p.queue_page}</Label>
                                </div>
                                <Switch checked={permissions.pages.queue} onCheckedChange={() => handlePageToggle('queue')} />
                            </div>
                            <div className="ps-7 space-y-3 opacity-90">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('queue_delete')}>{p.delete_campaigns}</Label>
                                    <Switch disabled={!permissions.pages.queue} checked={permissions.actions.queue_delete} onCheckedChange={() => handleActionToggle('queue_delete')} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('queue_send')}>{p.send_campaigns}</Label>
                                    <Switch disabled={!permissions.pages.queue} checked={permissions.actions.queue_send} onCheckedChange={() => handleActionToggle('queue_send')} />
                                </div>
                                <p className="text-xs text-gray-500 italic mt-1">{p.view_only_note}</p>
                            </div>
                        </div>

                        {/* History */}
                        <div className="space-y-4 border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/10">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-gray-500" />
                                    <Label className="font-semibold text-lg">{p.history_page}</Label>
                                </div>
                                <Switch checked={permissions.pages.history} onCheckedChange={() => handlePageToggle('history')} />
                            </div>
                            <div className="ps-7 space-y-3 opacity-90">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('history_delete')}>{p.delete_history}</Label>
                                    <Switch disabled={!permissions.pages.history} checked={permissions.actions.history_delete} onCheckedChange={() => handleActionToggle('history_delete')} />
                                </div>
                            </div>
                        </div>

                        {/* Hotels */}
                        <div className="space-y-4 border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/10">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-gray-500" />
                                    <Label className="font-semibold text-lg">{p.hotels_dir}</Label>
                                </div>
                                <Switch checked={permissions.pages.hotels} onCheckedChange={() => handlePageToggle('hotels')} />
                            </div>
                            <div className="ps-7 space-y-3 opacity-90">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('hotels_add')}>{p.add_hotel}</Label>
                                    <Switch disabled={!permissions.pages.hotels} checked={permissions.actions.hotels_add} onCheckedChange={() => handleActionToggle('hotels_add')} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('hotels_edit')}>{p.edit_hotel}</Label>
                                    <Switch disabled={!permissions.pages.hotels} checked={permissions.actions.hotels_edit} onCheckedChange={() => handleActionToggle('hotels_edit')} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm cursor-pointer" onClick={() => handleActionToggle('hotels_delete')}>{p.delete_hotel}</Label>
                                    <Switch disabled={!permissions.pages.hotels} checked={permissions.actions.hotels_delete} onCheckedChange={() => handleActionToggle('hotels_delete')} />
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                        {dict.common.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={savePermissions}
                        disabled={loading || saving}
                        className="px-8 py-2 bg-[#39285e] text-white rounded-lg hover:bg-[#2d1f4b] disabled:opacity-50 flex items-center justify-center text-sm font-medium transition-colors shadow-sm shadow-[#39285e]/20"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                        {saving ? p.saving : p.save_btn}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
