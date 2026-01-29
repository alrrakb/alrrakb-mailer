"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Search, MapPin, Building2, Phone, Star, Filter, Plus, ChevronDown, Check, Trash2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import HotelDetailsModal from '@/components/hotels/HotelDetailsModal';
import AddHotelModal from '@/components/hotels/AddHotelModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import HotelImporter from '@/components/hotels/HotelImporter';

export default function HotelsPage() {
    const { dict, language, dir } = useLanguage();
    const [hotels, setHotels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string | 'all'>('all');
    const [selectedRating, setSelectedRating] = useState<number | 'all'>('all'); // NEW: Star Filter
    const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [editingHotel, setEditingHotel] = useState<any | null>(null); // NEW: State for editing
    const [hotelToDelete, setHotelToDelete] = useState<any | null>(null); // NEW: State for delete confirmation

    // Dropdown States
    const [showCityFilter, setShowCityFilter] = useState(false);
    const [showRatingFilter, setShowRatingFilter] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', checkScroll);
        return () => window.removeEventListener('scroll', checkScroll);
    }, []);

    useEffect(() => {
        fetchHotels();
    }, []);

    // Reset City Filter when Language Changes
    useEffect(() => {
        setSelectedCity('all');
    }, [language]);

    const fetchHotels = async () => {
        try {
            const { data, error } = await supabase
                .from('hotels')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHotels(data || []);
        } catch (error) {
            console.error('Error fetching hotels:', error);
        } finally {
            setLoading(false);
        }
    };

    // Derived state for Cities (only cities that exist in data)
    const cities = useMemo(() => {
        // Get unique cities based on current language
        const uniqueCities = new Set<string>();
        hotels.forEach(h => {
            const city = language === 'ar'
                ? (h.city_ar || h.city)
                : (h.city_en || h.city);
            if (city) uniqueCities.add(city);
        });
        return Array.from(uniqueCities).sort();
    }, [hotels, language]);

    // Derived state for Ratings
    const ratings = [5, 4, 3, 2, 1];

    // Filter Logic
    const filteredHotels = useMemo(() => {
        return hotels.filter(hotel => {
            // Match against the localized city being displayed in the filter
            const hotelCity = language === 'ar'
                ? (hotel.city_ar || hotel.city)
                : (hotel.city_en || hotel.city);

            const matchesCity = selectedCity === 'all' || hotelCity === selectedCity;
            const matchesRating = selectedRating === 'all' || hotel.stars === selectedRating;

            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                (hotel.name_en?.toLowerCase().includes(searchLower)) ||
                (hotel.name_ar?.includes(searchQuery)) ||
                (hotel.city?.toLowerCase().includes(searchLower)) ||
                (hotel.city_en?.toLowerCase().includes(searchLower)) ||
                (hotel.city_ar?.includes(searchQuery));

            return matchesCity && matchesRating && matchesSearch;
        });
    }, [hotels, selectedCity, selectedRating, searchQuery, language]);

    // Handler for Edit
    const handleEdit = (e: React.MouseEvent, hotel: any) => {
        e.stopPropagation();
        setEditingHotel(hotel);
        setIsAddModalOpen(true);
    };

    // Handler for Delete Click (Opens Modal)
    const handleDeleteClick = (e: React.MouseEvent, hotel: any) => {
        e.stopPropagation();
        setHotelToDelete(hotel);
    };

    // Actual Delete Action
    const confirmDelete = async () => {
        if (!hotelToDelete) return;

        try {
            const { error } = await supabase
                .from('hotels')
                .delete()
                .eq('id', hotelToDelete.id);

            if (error) throw error;

            toast.success(dict.hotels?.delete_success || 'Hotel deleted successfully');
            setHotels(prev => prev.filter(h => h.id !== hotelToDelete.id));
        } catch (error) {
            console.error('Error deleting hotel:', error);
            toast.error(dict.hotels?.delete_error || 'Failed to delete hotel');
        } finally {
            setHotelToDelete(null);
        }
    };

    // Bulk Selection State
    const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSelected = new Set(selectedHotels);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedHotels(newSelected);
    };

    const handleBulkDelete = async () => {
        try {
            const idsToDelete = Array.from(selectedHotels);
            const { error } = await supabase
                .from('hotels')
                .delete()
                .in('id', idsToDelete);

            if (error) throw error;

            toast.success(dict.hotels.delete_success);
            setHotels(prev => prev.filter(h => !selectedHotels.has(h.id)));
            setSelectedHotels(new Set());
        } catch (error) {
            console.error('Error bulk deleting:', error);
            toast.error(dict.hotels.delete_error || 'Failed to delete hotels');
        } finally {
            setHotelToDelete(null); // Reuse this for closing modal
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20" onClick={() => {
            setShowCityFilter(false);
            setShowRatingFilter(false);
        }}>
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-8">
                    <HotelImporter onComplete={() => { fetchHotels(); }} />
                </div>

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#39285e] dark:text-white flex flex-wrap items-center gap-2">
                            <Building2 className="w-6 h-6 md:w-8 md:h-8 text-[#79bbe0]" />
                            {dict.hotels.title}
                            <span className="text-lg md:text-xl text-gray-400 font-medium">({filteredHotels.length})</span>
                        </h1>
                        <p className="text-sm md:text-base text-gray-500 mt-1">{dict.hotels.subtitle}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {selectedHotels.size > 0 && (
                            <button
                                onClick={() => setHotelToDelete({ id: 'bulk', name_en: 'Selected Hotels' })} // Dummy object to trigger modal
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-bold shadow-lg shadow-red-500/20 animate-in fade-in zoom-in-95"
                            >
                                <Trash2 className="w-4 h-4" />
                                {dict.hotels.delete_selected} ({selectedHotels.size})
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (isSelectionMode) {
                                    setSelectedHotels(new Set());
                                }
                                setIsSelectionMode(!isSelectionMode);
                            }}
                            className={`p-2.5 rounded-xl transition-all border ${isSelectionMode
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                                }`}
                            title={isSelectionMode ? "Exit Selection Mode" : "Select Hotels"}
                        >
                            <CheckSquare className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingHotel(null);
                                setIsAddModalOpen(true);
                            }}
                            className="btn-primary flex items-center gap-2 px-5 py-2.5 bg-[#39285e] text-white rounded-xl hover:bg-[#2d1f4b] transition-all shadow-lg shadow-[#39285e]/20"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-bold">{dict.hotels.add_hotel}</span>
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rtl:right-3 rtl:left-auto" />
                            <input
                                type="text"
                                placeholder={dict.hotels.search_placeholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 rtl:pr-10 rtl:pl-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#79bbe0] outline-none transition-all"
                            />
                        </div>

                        {/* Filters Container */}
                        <div className="flex flex-wrap gap-2 relative">

                            {/* City Filter Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCityFilter(!showCityFilter);
                                        setShowRatingFilter(false);
                                    }}
                                    className={`h-full px-4 py-2.5 rounded-xl border flex items-center gap-2 transition-colors min-w-[140px] justify-between ${selectedCity !== 'all' || showCityFilter
                                        ? 'bg-[#39285e] text-white border-[#39285e]'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin className="w-4 h-4 shrink-0" />
                                        <span className="text-sm font-medium truncate">
                                            {selectedCity === 'all' ? dict.hotels.filter_city : selectedCity}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showCityFilter ? 'rotate-180' : ''}`} />
                                </button>

                                {showCityFilter && (
                                    <div className="absolute top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95 origin-top rtl:left-0 ltr:right-0">
                                        <button
                                            onClick={() => setSelectedCity('all')}
                                            className="w-full px-4 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between group"
                                        >
                                            <span className={selectedCity === 'all' ? 'font-bold text-[#39285e] dark:text-[#79bbe0]' : ''}>{dict.hotels.all_cities}</span>
                                            {selectedCity === 'all' && <Check className="w-4 h-4 text-[#39285e] dark:text-[#79bbe0]" />}
                                        </button>
                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                        {cities.map(city => (
                                            <button
                                                key={city}
                                                onClick={() => setSelectedCity(city)}
                                                className="w-full px-4 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between"
                                            >
                                                <span className={selectedCity === city ? 'font-bold text-[#39285e] dark:text-[#79bbe0]' : ''}>{city}</span>
                                                {selectedCity === city && <Check className="w-4 h-4 text-[#39285e] dark:text-[#79bbe0]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Rating Filter Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowRatingFilter(!showRatingFilter);
                                        setShowCityFilter(false);
                                    }}
                                    className={`h-full px-4 py-2.5 rounded-xl border flex items-center gap-2 transition-colors min-w-[140px] justify-between ${selectedRating !== 'all' || showRatingFilter
                                        ? 'bg-yellow-500 text-white border-yellow-500'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Star className={`w-4 h-4 shrink-0 ${selectedRating !== 'all' ? 'fill-white' : ''}`} />
                                        <span className="text-sm font-medium truncate">
                                            {selectedRating === 'all' ? dict.hotels.filter_rating : `${selectedRating} Stars`}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showRatingFilter ? 'rotate-180' : ''}`} />
                                </button>

                                {showRatingFilter && (
                                    <div className="absolute top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95 origin-top rtl:left-0 ltr:right-0">
                                        <button
                                            onClick={() => setSelectedRating('all')}
                                            className="w-full px-4 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between group"
                                        >
                                            <span className={selectedRating === 'all' ? 'font-bold text-[#39285e] dark:text-[#79bbe0]' : ''}>{dict.hotels.all_ratings}</span>
                                            {selectedRating === 'all' && <Check className="w-4 h-4 text-[#39285e] dark:text-[#79bbe0]" />}
                                        </button>
                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                        {ratings.map(rating => (
                                            <button
                                                key={rating}
                                                onClick={() => setSelectedRating(rating)}
                                                className="w-full px-4 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between"
                                            >
                                                <span className={`flex items-center gap-1 ${selectedRating === rating ? 'font-bold text-[#39285e] dark:text-[#79bbe0]' : ''}`}>
                                                    {rating} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                </span>
                                                {selectedRating === rating && <Check className="w-4 h-4 text-[#39285e] dark:text-[#79bbe0]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-[#39285e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">{dict.common.loading}</p>
                    </div>
                ) : filteredHotels.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">{dict.hotels.no_hotels}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredHotels.map(hotel => (
                            <div
                                key={hotel.id}
                                onClick={() => setSelectedHotel(hotel)}
                                className={`group bg-white dark:bg-gray-900 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-lg overflow-hidden flex flex-col h-full relative ${selectedHotels.has(hotel.id)
                                    ? 'border-[#39285e] ring-2 ring-[#39285e]/20 dark:border-[#79bbe0] dark:ring-[#79bbe0]/20'
                                    : 'border-gray-200 dark:border-gray-800 hover:border-[#79bbe0] dark:hover:border-[#79bbe0]'
                                    }`}
                            >
                                {isSelectionMode && (
                                    <button
                                        onClick={(e) => toggleSelection(e, hotel.id)}
                                        className={`absolute top-4 left-4 rtl:right-4 rtl:left-auto z-20 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${selectedHotels.has(hotel.id)
                                            ? 'bg-[#39285e] border-[#39285e] text-white'
                                            : 'bg-white/80 border-gray-300 hover:border-[#39285e] text-transparent shadow-sm'
                                            }`}
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Edit Button */}
                                <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleEdit(e, hotel)}
                                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:bg-[#39285e] hover:text-white transition-colors"
                                        title={dict.hotels.edit_hotel}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                        </svg>
                                    </button>
                                    {/* Only show individual delete if not in bulk mode ?? Or keep it */}
                                    <button
                                        onClick={(e) => handleDeleteClick(e, hotel)}
                                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:bg-red-500 hover:text-white transition-colors text-red-500"
                                        title={dict.hotels?.delete_hotel || "Delete Hotel"}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Card content */}
                                <div className="p-6 flex-1">
                                    <div className={`flex justify-between items-start mb-4 ${isSelectionMode ? 'pl-8 rtl:pr-8' : ''}`}>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            {language === 'ar' ? (hotel.city_ar || hotel.city) : (hotel.city_en || hotel.city)}
                                        </div>
                                        {hotel.stars && (
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                <span className="font-bold text-sm">{hotel.stars}</span>
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#39285e] dark:group-hover:text-[#79bbe0] transition-colors">
                                        {language === 'ar' ? hotel.name_ar : hotel.name_en}
                                    </h3>

                                    <p className="text-sm text-gray-500 mb-4 line-clamp-1">
                                        {language === 'ar' ? hotel.name_en : hotel.name_ar}
                                    </p>

                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        {hotel.phone_reservations || hotel.phone_main ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Phone className="w-4 h-4 text-green-500" />
                                                <span className="font-mono dir-ltr" dir="ltr">
                                                    {hotel.phone_reservation || hotel.phone_main}
                                                </span>
                                            </div>
                                        ) : null}

                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span className="truncate max-w-full">
                                                {language === 'ar' ? (hotel.address_ar || hotel.address || hotel.city) : (hotel.address_en || hotel.address || hotel.city)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 text-center border-t border-gray-100 dark:border-gray-800 text-sm font-medium text-[#39285e] dark:text-[#79bbe0] group-hover:bg-[#39285e] group-hover:text-white transition-colors">
                                    {dict.hotels.view_details}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {selectedHotel && (
                    <HotelDetailsModal
                        hotel={selectedHotel}
                        onClose={() => setSelectedHotel(null)}
                    />
                )}

                {/* Add/Edit Modal */}
                {isAddModalOpen && (
                    <AddHotelModal
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setEditingHotel(null); // Clear editing state on close
                        }}
                        onSuccess={() => {
                            fetchHotels();
                            setIsAddModalOpen(false);
                            setEditingHotel(null);
                        }}
                        hotelToEdit={editingHotel} // Pass the hotel to edit
                    />
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmModal
                    isOpen={!!hotelToDelete}
                    title={
                        hotelToDelete?.id === 'bulk'
                            ? dict.hotels.bulk_delete_title
                            : (dict.hotels?.delete_title || 'Delete Hotel')
                    }
                    message={
                        hotelToDelete?.id === 'bulk'
                            ? dict.hotels.bulk_delete_confirm.replace('{count}', selectedHotels.size.toString())
                            : (dict.hotels?.confirm_delete || 'Are you sure?')
                    }
                    confirmText={dict.hotels?.delete_confirm || dict.common.confirm}
                    cancelText={dict.common?.cancel || 'Cancel'}
                    onConfirm={hotelToDelete?.id === 'bulk' ? handleBulkDelete : confirmDelete}
                    onCancel={() => setHotelToDelete(null)}
                    isDestructive={true}
                />

                {/* Scroll to Top Button */}
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className={`fixed bottom-6 right-6 rtl:left-6 rtl:right-auto bg-[#39285e] text-white p-3 rounded-full shadow-lg hover:bg-[#2d1f4b] transition-all duration-300 z-40 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                    title="Scroll to Top"
                >
                    <ChevronDown className="w-6 h-6 rotate-180" />
                </button>

            </div>
        </div >
    );
}
