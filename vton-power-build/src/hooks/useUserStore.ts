import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  digitalTwinImage: string | null;
  weight: string;
  height: string;
  size: string;
  setDigitalTwin: (image: string, weight: string, height: string, size: string) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      digitalTwinImage: null,
      weight: "",
      height: "",
      size: "",
      setDigitalTwin: (image, weight, height, size) => set({ 
        digitalTwinImage: image, 
        weight, 
        height, 
        size 
      }),
      clearProfile: () => set({ digitalTwinImage: null, weight: "", height: "", size: "" }),
    }),
    {
      name: 'vton-user-storage', // LocalStorage'daki isim
    }
  )
);