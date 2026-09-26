export type CourierVehicleType = 'motorcycle' | 'car' | 'bicycle' | 'on_foot';

export interface Courier {
  id: string;
  profileId: string | null;
  displayName: string;
  phone: string;
  vehicleType: CourierVehicleType;
  isActive: boolean;
  isOnShift: boolean;
  currentLat: number | null;
  currentLng: number | null;
  locationUpdatedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}
