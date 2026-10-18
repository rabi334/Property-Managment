import { create } from 'zustand';
import { Property } from '@/types/database';
import { propertyService, CreatePropertyData, UpdatePropertyData } from '@/services/property.service';

interface PropertyState {
  properties: Property[];
  selectedProperty: Property | null;
  isLoading: boolean;
  fetchProperties: () => Promise<void>;
  fetchPropertyById: (id: string) => Promise<void>;
  createProperty: (data: CreatePropertyData) => Promise<void>;
  updateProperty: (id: string, data: UpdatePropertyData) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  setSelectedProperty: (property: Property | null) => void;
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
  properties: [],
  selectedProperty: null,
  isLoading: false,

  fetchProperties: async () => {
    try {
      set({ isLoading: true });
      const properties = await propertyService.getAll();
      set({ properties, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchPropertyById: async (id: string) => {
    try {
      set({ isLoading: true });
      const property = await propertyService.getById(id);
      set({ selectedProperty: property as Property, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createProperty: async (data: CreatePropertyData) => {
    try {
      await propertyService.create(data);
      await get().fetchProperties();
    } catch (error) {
      throw error;
    }
  },

  updateProperty: async (id: string, data: UpdatePropertyData) => {
    try {
      await propertyService.update(id, data);
      await get().fetchProperties();
    } catch (error) {
      throw error;
    }
  },

  deleteProperty: async (id: string) => {
    try {
      console.log('Deleting property:', id);
      await propertyService.delete(id);
      console.log('Property deleted, fetching updated list');
      await get().fetchProperties();
      console.log('List updated after delete');
    } catch (error) {
      console.error('Delete property error:', error);
      throw error;
    }
  },

  setSelectedProperty: (property) => set({ selectedProperty: property }),
}));
