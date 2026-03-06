
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

interface Template {
    id: string;
    name: string;
    subject: string;
    thumbnail_url?: string;
    created_at: string;
}

export default async function TemplatesPage() {
    const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="py-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Email Templates</h1>
                    <p className="text-gray-500">Manage your reusable email designs.</p>
                </div>
                <Link
                    href="/templates/create"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Template
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates && templates.length > 0 ? (
                    templates.map((template: Template) => (
                        <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="aspect-video bg-gray-100 flex items-center justify-center border-b border-gray-100 relative">
                                {template.thumbnail_url ? (
                                    <div className="w-full h-full relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <FileText className="w-12 h-12 text-gray-300" />
                                )}
                                {/* Actions overlay could go here */}
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-800 mb-1">{template.name}</h3>
                                <p className="text-sm text-gray-500 truncate">{template.subject}</p>
                                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                                    <button className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No templates yet</h3>
                        <p className="text-gray-500 mb-4">Create your first template to get started.</p>
                        <Link
                            href="/templates/create"
                            className="text-blue-600 font-medium hover:underline"
                        >
                            Create Template &rarr;
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
