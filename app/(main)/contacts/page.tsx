
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Mail, User, Loader2 } from 'lucide-react';

export default function ContactsPage() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setContacts(data || []);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const addContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;

        setAdding(true);
        try {
            const { data, error } = await supabase
                .from('contacts')
                .insert({ email: newEmail, name: newName })
                .select()
                .single();

            if (error) throw error;

            setContacts([data, ...contacts]);
            setNewEmail('');
            setNewName('');
        } catch (error: any) {
            alert('Error adding contact: ' + error.message);
        } finally {
            setAdding(false);
        }
    };

    const deleteContact = async (id: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            const { error } = await supabase.from('contacts').delete().eq('id', id);
            if (error) throw error;
            setContacts(contacts.filter(c => c.id !== id));
        } catch (error: any) {
            alert('Error deleting contact: ' + error.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Contacts Manager</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Add New Contact</h2>
                <form onSubmit={addContact} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="john@example.com"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={adding}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 h-[42px]"
                    >
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-700">All Contacts ({contacts.length})</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading contacts...</div>
                ) : contacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No contacts found. Add one above!</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {contacts.map(contact => (
                            <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                        {(contact.name?.[0] || contact.email[0]).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{contact.name || 'Unknown'}</p>
                                        <p className="text-sm text-gray-500">{contact.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteContact(contact.id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
