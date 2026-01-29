"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust path if needed
import { Upload, Image as ImageIcon, X, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

interface ImageManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

interface StorageFile {
    name: string;
    id: string; // usually name
    url: string;
    metadata?: any;
    created_at?: string;
}

export default function ImageManager({ isOpen, onClose, onSelect }: ImageManagerProps) {
    const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
    const [images, setImages] = useState<StorageFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch images when opening library
    useEffect(() => {
        if (isOpen && activeTab === 'library') {
            fetchImages();
        }
    }, [isOpen, activeTab]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .storage
                .from('images')
                .list('uploads', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) {
                console.error('Error fetching images:', error);
                return;
            }

            if (data) {
                const processedImages = data.map(file => {
                    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`uploads/${file.name}`);
                    return {
                        name: file.name,
                        id: file.id || file.name,
                        url: publicUrl,
                        created_at: file.created_at,
                    };
                });
                setImages(processedImages);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(`uploads/${fileName}`, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get URL and select immediately
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`uploads/${fileName}`);
            onSelect(publicUrl);
            onClose(); // Auto close on success

        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleDelete = async (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation(); // prevent select
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const { error } = await supabase.storage.from('images').remove([`uploads/${fileName}`]);
            if (error) throw error;
            fetchImages(); // Refresh
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] min-h-[500px]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Image Manager</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('library')}
                        className={clsx(
                            "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                            activeTab === 'library'
                                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-400"
                                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        )}
                    >
                        <ImageIcon className="w-4 h-4" /> Library
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={clsx(
                            "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                            activeTab === 'upload'
                                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-400"
                                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        )}
                    >
                        <Upload className="w-4 h-4" /> Upload
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50">
                    {activeTab === 'library' ? (
                        <>
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : images.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                    <p>No images found</p>
                                    <button
                                        onClick={() => setActiveTab('upload')}
                                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
                                    >
                                        Upload New Image
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {images.map((img) => (
                                        <div
                                            key={img.id}
                                            className="group relative aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition"
                                            onClick={() => { onSelect(img.url); onClose(); }}
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white font-medium text-sm">Select</span>
                                                <button
                                                    onClick={(e) => handleDelete(e, img.name)}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {img.created_at && (
                                                    <div className="absolute top-2 left-2 group/info">
                                                        <div className="p-1.5 bg-black/60 text-white rounded-full cursor-help">
                                                            <AlertCircle className="w-4 h-4" />
                                                        </div>
                                                        <div className="absolute left-0 top-full mt-1 hidden group-hover/info:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                            {new Date(img.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div
                                className={clsx(
                                    "w-full max-w-lg border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                                    dragActive
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                )}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                                />

                                {uploading ? (
                                    <>
                                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                        <p className="text-gray-600 dark:text-gray-300 font-medium">Uploading...</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                                        <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Click to Upload
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            or drag and drop your image here
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
