export type DeviceStatus = 'in_stock' | 'sold' | 'returned' | 'quarantine' | 'repair' | 'qc_required' | 'qc_failed';

export interface CellularDevice {
  id: string;
  imei: string;
  tac_id: string;
  color?: string;
  storage_gb?: number;
  grade_id?: number;
  status: DeviceStatus;
  location_id?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  tac_code?: {
    tac_code: string;
    model_name: string;
    manufacturer: {
      name: string;
    };
  };
  grade?: {
    grade: string;
    description: string;
  };
  location?: {
    location_code: string;
    description: string;
  };
}

export interface SerialDevice {
  id: string;
  serial_number: string;
  manufacturer_id: string;
  model_name: string;
  color?: string;
  grade_id?: number;
  status: DeviceStatus;
  location_id?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  manufacturer: {
    name: string;
  };
  grade?: {
    grade: string;
    description: string;
  };
  location?: {
    location_code: string;
    description: string;
  };
}
