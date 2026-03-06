"use client";

import { useState, useEffect } from 'react';
import { X, Star, Edit, Trash2, Plus, Save, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { toast } from 'sonner';

interface Template {
    id: string;
    name: string;
    html_content: string;
    is_default: boolean;
    created_at?: string;
}

interface TemplateManagerModalProps {
    onClose: () => void;
    onChanged: () => void; // Triggered when templates are added/edited/deleted
}

export default function TemplateManagerModal({ onClose, onChanged }: TemplateManagerModalProps) {
    const { user } = useAuth();
    const { dict, language } = useLanguage();
    const isAr = language === 'ar';

    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'list' | 'form'>('list');

    // Form State
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [formData, setFormData] = useState({ name: '', html_content: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            fetchTemplates();
        }
    }, [user]);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to load templates");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            // First set all to false
            const { error: err1 } = await supabase
                .from('templates')
                .update({ is_default: false })
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (err1) throw err1;

            // Then set the selected to true
            const { error: err2 } = await supabase
                .from('templates')
                .update({ is_default: true })
                .eq('id', id);

            if (err2) throw err2;

            toast.success(dict.common.success);
            fetchTemplates();
            onChanged();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : dict.common.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(dict.common.confirm)) return;

        try {
            const { error } = await supabase
                .from('templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success(dict.common.success);
            fetchTemplates();
            onChanged();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : dict.common.error);
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.html_content.trim()) {
            toast.error(dict.common.error);
            return;
        }

        setIsSaving(true);
        try {
            if (editingTemplate) {
                // Update
                const { error } = await supabase
                    .from('templates')
                    .update({
                        name: formData.name,
                        html_content: formData.html_content
                    })
                    .eq('id', editingTemplate.id);

                if (error) throw error;
                toast.success(dict.common.success);
            } else {
                // Insert
                const { error } = await supabase
                    .from('templates')
                    .insert({
                        user_id: user?.id,
                        name: formData.name,
                        html_content: formData.html_content,
                        is_default: templates.length === 0 // Make default if it's the first one
                    });

                if (error) throw error;
                toast.success(dict.common.success);
            }

            setView('list');
            fetchTemplates();
            onChanged();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : dict.common.error);
        } finally {
            setIsSaving(false);
        }
    };

    const openEdit = (template: Template) => {
        setEditingTemplate(template);
        setFormData({ name: template.name, html_content: template.html_content });
        setView('form');
    };

    const openCreate = () => {
        setEditingTemplate(null);
        setFormData({ name: '', html_content: '' });
        setView('form');
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
                    <div className="flex items-center gap-3">
                        {view === 'form' && (
                            <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {view === 'list'
                                    ? dict.templates.manage_templates
                                    : (editingTemplate ? dict.templates.edit : dict.templates.add_new)
                                }
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {view === 'list'
                                    ? dict.templates.manage_templates // could add subset desc, but this works
                                    : dict.templates.content_label
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 min-h-0">
                    {view === 'list' ? (
                        <div className="space-y-4">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={openCreate}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#39285e] text-white rounded-lg font-medium hover:bg-[#2d1f4b] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    {dict.templates.add_new}
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#39285e] dark:text-[#79bbe0]" />
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                    <p className="text-gray-500">{dict.templates.no_data}</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {templates.map(template => (
                                        <div key={template.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{template.name}</h4>
                                                    {template.is_default && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full shrink-0">
                                                            {dict.templates.is_default}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {new Date(template.created_at || '').toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleSetDefault(template.id)}
                                                    className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${template.is_default ? 'bg-yellow-100 text-yellow-700 cursor-default' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600'}`}
                                                    disabled={template.is_default}
                                                    title={dict.templates.set_default}
                                                >
                                                    <Star className={`w-4 h-4 ${template.is_default ? 'fill-current' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => openEdit(template)}
                                                    className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                                    title={dict.templates.edit}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(template.id)}
                                                    className="p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                                    disabled={template.is_default} // Prevent deleting default? Maybe, or let them delete and default drops
                                                    title={dict.templates.delete}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {dict.templates.name_label}
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] outline-none transition-all dark:text-white"
                                    placeholder={dict.templates.name_label}
                                    dir={isAr ? 'rtl' : 'ltr'}
                                />
                            </div>
                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex justify-between items-end">
                                    <span>{dict.templates.content_label}</span>
                                </label>
                                <textarea
                                    value={formData.html_content}
                                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                                    className="w-full flex-1 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] outline-none font-mono text-sm resize-none dark:text-gray-300 min-h-[300px]"
                                    placeholder={`<html>\n  <body>\n    <div class="header">...</div>\n    <div class="content">\n      {{EMAIL_CONTENT}}\n    </div>\n  </body>\n</html>`}
                                    spellCheck={false}
                                    dir="ltr"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => setView('list')}
                                    className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
                                >
                                    {dict.templates.cancel}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-[#39285e] text-white rounded-xl font-bold hover:bg-[#2d1f4b] transition-colors disabled:opacity-70"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {dict.templates.save}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
