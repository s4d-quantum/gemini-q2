import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package2, Loader2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DeviceStatus } from '../types/database';

interface BookDeviceShipmentProps {
  isOpen: boolean;
  onClose: () => void;
  onShipmentBooked: () => void;
  deviceType: 'cellular' | 'serial';
}

interface DeviceEntry {
  identifier: string; // IMEI or Serial
  manufacturer: string;
  model: string;
  color: string;
  storage: string;
  grade: string;
  status: DeviceStatus;
  location: string; // Tray ID
  requiresQC: boolean;
  requiresRepair: boolean;
  isEditing?: boolean;
  error?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: {
    name: string;
  };
}

interface DeviceConfig {
  available_colors: string[];
  storage_options: string[];
}

const TRAY_CAPACITY = 50;

const BookDeviceShipment: React.FC<BookDeviceShipmentProps> = ({
  isOpen,
  onClose,
  onShipmentBooked,
  deviceType,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [currentIdentifier, setCurrentIdentifier] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [nextAvailableTray, setNextAvailableTray] = useState<string>('');
  const [batchQC, setBatchQC] = useState(true);
  const [batchRepair, setBatchRepair] = useState(false);
  const [colorInput, setColorInput] = useState('');
  const [filteredColors, setFilteredColors] = useState<string[]>([]);
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);

  // Audio for error alerts
  const errorBeep = new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3');

  useEffect(() => {
    if (isOpen) {
      loadPurchaseOrders();
      findNextAvailableTray();
    }
  }, [isOpen]);

  const loadPurchaseOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        supplier:suppliers(name)
      `)
      .eq('status', 'pending');

    if (error) {
      console.error('Error loading POs:', error);
      return;
    }

    setPurchaseOrders(data || []);
  };

  const findNextAvailableTray = async () => {
    const { data: locations } = await supabase
      .from('storage_locations')
      .select('location_code')
      .order('location_code', { ascending: false })
      .limit(1);

    let nextTray = 'TRAY001';
    if (locations && locations.length > 0) {
      const lastTray = locations[0].location_code;
      const trayNumber = parseInt(lastTray.replace('TRAY', '')) + 1;
      nextTray = `TRAY${trayNumber.toString().padStart(3, '0')}`;
    }
    setNextAvailableTray(nextTray);
  };

  const assignTray = (index: number): string => {
    const trayIndex = Math.floor(index / TRAY_CAPACITY);
    const trayNumber = parseInt(nextAvailableTray.replace('TRAY', '')) + trayIndex;
    return `TRAY${trayNumber.toString().padStart(3, '0')}`;
  };

  const loadDeviceConfig = async (manufacturer: string, model: string) => {
    try {
      const { data, error } = await supabase
        .from('device_configurations')
        .select('available_colors, storage_options')
        .eq('manufacturer', manufacturer)
        .eq('model_name', model)
        .maybeSingle(); // Change from single() to maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no configuration exists, return null without error
      if (!data) {
        console.log(`No configuration found for ${manufacturer} ${model}`);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error loading device configuration:', err);
      return null;
    }
  };

  const validateDeviceConfig = (device: DeviceEntry, config: DeviceConfig | null) => {
    // If no config exists, skip validation
    if (!config) return null;

    const errors: string[] = [];

    if (config.available_colors?.length > 0 && device.color && 
        !config.available_colors.includes(device.color)) {
      errors.push(`Invalid color. Available colors: ${config.available_colors.join(', ')}`);
    }

    if (config.storage_options?.length > 0 && device.storage_gb && 
        !config.storage_options.includes(device.storage_gb)) {
      errors.push(`Invalid storage option. Available options: ${config.storage_options.join(', ')}GB`);
    }

    if (errors.length > 0) {
      errorBeep.play().catch(console.error);
      return errors.join('\n');
    }

    return null;
  };

  const handleIdentifierScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!currentIdentifier) return;

      if (deviceType === 'cellular' && !/^\d{15}$/.test(currentIdentifier)) {
        setError('IMEI must be exactly 15 digits');
        return;
      }

      const { data: existingDevice } = await supabase
        .from(deviceType === 'cellular' ? 'cellular_devices' : 'serial_devices')
        .select('id')
        .eq(deviceType === 'cellular' ? 'imei' : 'serial_number', currentIdentifier)
        .single();

      if (existingDevice) {
        setError(`Device with this ${deviceType === 'cellular' ? 'IMEI' : 'serial number'} already exists`);
        return;
      }

      let newDevice: DeviceEntry = {
        identifier: currentIdentifier,
        manufacturer: '',
        model: '',
        color: '',
        storage: '',
        grade: '',
        status: 'qc_required',
        location: assignTray(devices.length),
        requiresQC: batchQC,
        requiresRepair: batchRepair,
      };

      if (deviceType === 'cellular') {
        const tacCode = currentIdentifier.slice(0, 8);
        const { data: tacInfo } = await supabase
          .from('tac_codes')
          .select(`
            model_name,
            manufacturer
          `)
          .eq('tac_code', tacCode)
          .single();

        if (tacInfo) {
          newDevice.manufacturer = tacInfo.manufacturer;
          newDevice.model = tacInfo.model_name;
          
          // Load device configuration
          const config = await loadDeviceConfig(tacInfo.manufacturer, tacInfo.model_name);
          if (config) {
            setDeviceConfig(config);
          }
        }
      }

      if (!devices.some(d => d.identifier === newDevice.identifier)) {
        setDevices(prev => [...prev, newDevice]);
        setCurrentIdentifier('');
        setError(null);
      }
    }
  };

  const handleColorInputChange = (value: string) => {
    setColorInput(value);
    if (deviceConfig?.available_colors) {
      const filtered = deviceConfig.available_colors.filter(color => 
        color.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredColors(filtered);
    }
  };

  const updateDevice = (identifier: string, field: keyof DeviceEntry, value: any) => {
    setDevices(prev => prev.map(device => {
      if (device.identifier === identifier) {
        const updatedDevice = { ...device, [field]: value };
        
        // Validate against device configuration if available
        if (deviceConfig) {
          const configError = validateDeviceConfig(updatedDevice, deviceConfig);
          if (configError) {
            return { ...updatedDevice, error: configError };
          }
        }
        
        return { ...updatedDevice, error: undefined };
      }
      return device;
    }));
  };

  const removeDevice = (identifier: string) => {
    setDevices(prev => {
      const newDevices = prev.filter(d => d.identifier !== identifier);
      // Reassign trays after removal to keep them sequential
      return newDevices.map((device, index) => ({
        ...device,
        location: assignTray(index)
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) {
      setError('Please select a purchase order');
      return;
    }
    if (devices.length === 0) {
      setError('Please add at least one device');
      return;
    }

    // Check for any device errors before proceeding
    const deviceErrors = devices.filter(d => d.error);
    if (deviceErrors.length > 0) {
      setError('Please correct device configuration errors before proceeding');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          requires_qc: devices.some(d => d.requiresQC),
          requires_repair: devices.some(d => d.requiresRepair)
        })
        .eq('id', selectedPO);

      if (poError) throw poError;

      for (const device of devices) {
        if (deviceType === 'cellular') {
          const tacCode = device.identifier.slice(0, 8);
          
          const { data: tacData } = await supabase
            .from('tac_codes')
            .select('id')
            .eq('tac_code', tacCode)
            .single();

          let tacId;
          if (!tacData) {
            const { data: newTac, error: createTacError } = await supabase
              .from('tac_codes')
              .insert({
                tac_code: tacCode,
                manufacturer: device.manufacturer,
                model_name: device.model,
              })
              .select('id')
              .single();

            if (createTacError) throw createTacError;
            tacId = newTac.id;
          } else {
            tacId = tacData.id;
          }

          let locationId = null;
          if (device.location) {
            const { data: location } = await supabase
              .from('storage_locations')
              .select('id')
              .eq('location_code', device.location)
              .single();
            
            locationId = location?.id;
          }

          const { error: deviceError } = await supabase
            .from('cellular_devices')
            .insert({
              imei: device.identifier,
              tac_id: tacId,
              color: device.color || null,
              storage_gb: device.storage ? parseInt(device.storage) : null,
              grade_id: device.grade || null,
              status: device.requiresQC ? 'qc_required' : (device.requiresRepair ? 'repair' : 'in_stock'),
              location_id: locationId,
              created_by: (await supabase.auth.getUser()).data.user?.id,
              updated_by: (await supabase.auth.getUser()).data.user?.id,
            });

          if (deviceError) throw deviceError;
        } else {
          let locationId = null;
          if (device.location) {
            const { data: location } = await supabase
              .from('storage_locations')
              .select('id')
              .eq('location_code', device.location)
              .single();
            
            locationId = location?.id;
          }

          const { error: deviceError } = await supabase
            .from('serial_devices')
            .insert({
              serial_number: device.identifier,
              manufacturer: device.manufacturer,
              model_name: device.model,
              color: device.color || null,
              grade_id: device.grade || null,
              status: device.requiresQC ? 'qc_required' : (device.requiresRepair ? 'repair' : 'in_stock'),
              location_id: locationId,
              created_by: (await supabase.auth.getUser()).data.user?.id,
              updated_by: (await supabase.auth.getUser()).data.user?.id,
            });

          if (deviceError) throw deviceError;
        }
      }

      onShipmentBooked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Book {deviceType === 'cellular' ? 'IMEI' : 'Serial'} Devices Shipment
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Order
          </label>
          <select
            value={selectedPO}
            onChange={(e) => setSelectedPO(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select Purchase Order</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.po_number} - {po.supplier.name}
              </option>
            ))}
          </select>
        </div>

        {/* Batch QC/Repair Settings */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Batch Settings</h3>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={batchQC}
                onChange={(e) => setBatchQC(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Requires QC</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={batchRepair}
                onChange={(e) => setBatchRepair(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Requires Repair</span>
            </label>
          </div>
        </div>

        {/* Scanner Input */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                {deviceType === 'cellular' ? 'Scan IMEI' : 'Scan Serial Number'}
              </label>
              <input
                type="text"
                value={currentIdentifier}
                onChange={(e) => setCurrentIdentifier(e.target.value)}
                onKeyDown={handleIdentifierScan}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder={`Scan ${deviceType === 'cellular' ? 'IMEI' : 'serial number'}...`}
                autoFocus
              />
            </div>
            <div className="flex-shrink-0 pt-6">
              <span className="text-sm text-gray-500">
                Next Tray: {nextAvailableTray}
              </span>
            </div>
          </div>
        </div>

        {/* Scanned Devices List */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">
            Scanned Devices ({devices.length})
          </h3>
          
          <div className="space-y-4">
            {devices.length === 0 ? (
              <div className="text-center text-gray-500 p-4 border rounded-lg">
                No devices scanned yet
              </div>
            ) : (
              Object.entries(
                devices.reduce((acc, device) => {
                  const tray = device.location;
                  if (!acc[tray]) acc[tray] = [];
                  acc[tray].push(device);
                  return acc;
                }, {} as Record<string, DeviceEntry[]>)
              ).map(([tray, trayDevices]) => (
                <div key={tray} className="border rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 rounded-t-lg flex justify-between items-center">
                    <h4 className="font-medium">
                      {tray} ({trayDevices.length} devices)
                    </h4>
                    <span className="text-sm text-gray-500">
                      {trayDevices.length}/{TRAY_CAPACITY}
                    </span>
                  </div>
                  <div className="divide-y">
                    {trayDevices.map((device) => (
                      <div key={device.identifier} className="p-4">
                        <div className="flex justify-between mb-2">
                          <div>
                            <div className="font-medium">{device.identifier}</div>
                            <div className="text-sm text-gray-500">
                              {device.manufacturer} {device.model}
                            </div>
                          </div>
                          <button
                            onClick={() => removeDevice(device.identifier)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        {device.error && (
                          <div className="mb-2 text-sm text-red-600">
                            {device.error}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Color</label>
                            <input
                              type="text"
                              value={device.color}
                              onChange={(e) => updateDevice(device.identifier, 'color', e.target.value)}
                              className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="e.g., Black"
                              list={`colors-${device.identifier}`}
                            />
                            <datalist id={`colors-${device.identifier}`}>
                              {deviceConfig?.available_colors?.map((color) => (
                                <option key={color} value={color} />
                              ))}
                            </datalist>
                          </div>
                          {deviceType === 'cellular' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500">Storage (GB)</label>
                              <select
                                value={device.storage}
                                onChange={(e) => updateDevice(device.identifier, 'storage', e.target.value)}
                                className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              >
                                <option value="">Select Storage</option>
                                {deviceConfig?.storage_options?.map((storage) => (
                                  <option key={storage} value={storage}>
                                    {storage}GB
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Grade</label>
                            <select
                              value={device.grade}
                              onChange={(e) => updateDevice(device.identifier, 'grade', e.target.value)}
                              className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="">Select Grade</option>
                              <option value="1">Grade A</option>
                              <option value="2">Grade B</option>
                              <option value="3">Grade C</option>
                              <option value="4">Grade D</option>
                              <option value="5">Grade E</option>
                              <option value="6">Grade F</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || devices.length === 0 || !selectedPO}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <Package2 className="w-4 h-4 mr-2" />
                Book Shipment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDeviceShipment;
