import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddPurchaseOrderDevicesProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicesAdded: () => void;
  purchaseOrderId: string;
}

interface DeviceEntry {
  manufacturer: string;
  manufacturer_id?: string;
  model: string;
  storage_gb?: string;
  color?: string;
  grade_id?: string;
  quantity: number;
  type: 'cellular' | 'serial';
  identifier: string;
  error?: string;
}

interface IMEIResponse {
  status: string;
  object: {
    brand: string;
    name: string;
    model: string;
  };
}

interface DeviceConfig {
  available_colors: string[];
  storage_options: string[];
}

const AddPurchaseOrderDevices: React.FC<AddPurchaseOrderDevicesProps> = ({
  isOpen,
  onClose,
  onDevicesAdded,
  purchaseOrderId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceEntries, setDeviceEntries] = useState<DeviceEntry[]>([]);
  const [currentIdentifier, setCurrentIdentifier] = useState('');
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  
  const [defaultValues, setDefaultValues] = useState({
    color: '',
    storage_gb: '',
    grade_id: '',
  });

  // Audio for error alerts
  const errorBeep = new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3');

  useEffect(() => {
    if (isOpen) {
      setDeviceEntries([]);
      setCurrentIdentifier('');
      setError(null);
      setDefaultValues({
        color: '',
        storage_gb: '',
        grade_id: '',
      });
    }
  }, [isOpen]);

  const fetchIMEIData = async (imei: string): Promise<IMEIResponse> => {
    const response = await fetch(`https://alpha.imeicheck.com/api/modelBrandName?imei=${imei}&format=json`);
    if (!response.ok) {
      throw new Error('Failed to fetch IMEI data');
    }
    return response.json();
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

  const checkDeviceExists = async (identifier: string, type: 'cellular' | 'serial'): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from(type === 'cellular' ? 'cellular_devices' : 'serial_devices')
        .select('id')
        .eq(type === 'cellular' ? 'imei' : 'serial_number', identifier)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking device existence:', error);
      return false;
    }
  };

  const handleIdentifierScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!currentIdentifier) return;

      if (!/^\d{15}$/.test(currentIdentifier)) {
        setError('IMEI must be exactly 15 digits');
        return;
      }

      try {
        // Check if device already exists in database
        const exists = await checkDeviceExists(currentIdentifier, 'cellular');
        if (exists) {
          setError('Device with this IMEI already exists in the system');
          return;
        }

        const imeiData = await fetchIMEIData(currentIdentifier);
        
        if (imeiData.status !== 'succes') {
          throw new Error('Invalid IMEI or device not found');
        }

        // Load device configuration
        const config = await loadDeviceConfig(imeiData.object.brand, `${imeiData.object.name} (${imeiData.object.model})`);

        const newDevice: DeviceEntry = {
          identifier: currentIdentifier,
          manufacturer: imeiData.object.brand,
          model: `${imeiData.object.name} (${imeiData.object.model})`,
          color: defaultValues.color,
          storage_gb: defaultValues.storage_gb,
          grade_id: defaultValues.grade_id || undefined,
          quantity: 1,
          type: 'cellular',
        };

        // Validate against configuration if available
        if (config) {
          const configError = validateDeviceConfig(newDevice, config);
          if (configError) {
            newDevice.error = configError;
          }
        }

        if (!deviceEntries.some(d => d.identifier === newDevice.identifier)) {
          setDeviceEntries(prev => [...prev, newDevice]);
          setCurrentIdentifier('');
          setError(null);
        } else {
          setError('This IMEI has already been added to the list');
        }
      } catch (err) {
        console.error('Error fetching IMEI data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch device information');
      }
    }
  };

  const updateDevice = (identifier: string, field: keyof DeviceEntry, value: any) => {
    setDeviceEntries(prev => prev.map(device => {
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

    if (field === 'color' || field === 'storage_gb' || field === 'grade_id') {
      setDefaultValues(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const removeDevice = (identifier: string) => {
    setDeviceEntries(prev => prev.filter(d => d.identifier !== identifier));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (deviceEntries.length === 0) {
        throw new Error('Please add at least one device');
      }

      // Check for any device errors before proceeding
      const deviceErrors = deviceEntries.filter(d => d.error);
      if (deviceErrors.length > 0) {
        throw new Error('Please correct device configuration errors before proceeding');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, add devices to the planned devices table
      const { error: plannedError } = await supabase
        .from('purchase_order_devices_planned')
        .insert(
          deviceEntries.map(entry => ({
            purchase_order_id: purchaseOrderId,
            manufacturer: entry.manufacturer,
            model_name: entry.model,
            storage_gb: entry.storage_gb,
            color: entry.color,
            grade_id: entry.grade_id,
            quantity: entry.quantity,
            device_type: entry.type,
            created_by: user.id,
            updated_by: user.id,
          }))
        );

      if (plannedError) throw plannedError;

      // Then, create the actual devices and link them to the purchase order
      for (const device of deviceEntries) {
        if (device.type === 'cellular') {
          // Double-check device doesn't exist before creating
          const exists = await checkDeviceExists(device.identifier, 'cellular');
          if (exists) {
            throw new Error(`Device with IMEI ${device.identifier} already exists in the system`);
          }

          const tacCode = device.identifier.slice(0, 8);
          
          // Check if TAC code exists
          const { data: tacData } = await supabase
            .from('tac_codes')
            .select('id')
            .eq('tac_code', tacCode)
            .maybeSingle();

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

          // Create cellular device
          const { data: newDevice, error: deviceError } = await supabase
            .from('cellular_devices')
            .insert({
              imei: device.identifier,
              tac_id: tacId,
              color: device.color || null,
              storage_gb: device.storage_gb ? parseInt(device.storage_gb) : null,
              grade_id: device.grade_id || null,
              status: 'in_stock',
              created_by: user.id,
              updated_by: user.id,
            })
            .select('id')
            .single();

          if (deviceError) throw deviceError;

          // Link device to purchase order
          const { error: linkError } = await supabase
            .from('purchase_order_devices')
            .insert({
              purchase_order_id: purchaseOrderId,
              cellular_device_id: newDevice.id,
              qc_required: false,
              qc_completed: false,
              repair_required: false,
              repair_completed: false,
              return_tag: false,
              unit_confirmed: false,
              created_by: user.id,
              updated_by: user.id,
            });

          if (linkError) throw linkError;
        }
      }

      onDevicesAdded();
      onClose();
    } catch (err) {
      console.error('Error adding devices:', err);
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
          <h2 className="text-xl font-semibold">Add Devices to Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Scan IMEI
                </label>
                <input
                  type="text"
                  value={currentIdentifier}
                  onChange={(e) => setCurrentIdentifier(e.target.value)}
                  onKeyDown={handleIdentifierScan}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Scan IMEI..."
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Default Values for New Scans</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="text"
                  value={defaultValues.color}
                  onChange={(e) => setDefaultValues(prev => ({ ...prev, color: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Black"
                  list="default-colors"
                />
                <datalist id="default-colors">
                  {deviceConfig?.available_colors?.map((color) => (
                    <option key={color} value={color} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Storage (GB)</label>
                <select
                  value={defaultValues.storage_gb}
                  onChange={(e) => setDefaultValues(prev => ({ ...prev, storage_gb: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select Storage</option>
                  {deviceConfig?.storage_options?.map((storage) => (
                    <option key={storage} value={storage}>
                      {storage}GB
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grade</label>
                <select
                  value={defaultValues.grade_id}
                  onChange={(e) => setDefaultValues(prev => ({ ...prev, grade_id: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">
              Scanned Devices ({deviceEntries.length})
            </h3>
            
            <div className="space-y-4">
              {deviceEntries.length === 0 ? (
                <div className="text-center text-gray-500 p-4 border rounded-lg">
                  No devices scanned yet
                </div>
              ) : (
                deviceEntries.map((device) => (
                  <div key={device.identifier} className="border rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <div>
                        <div className="font-medium">{device.manufacturer} {device.model}</div>
                        <div className="text-sm text-gray-500">{device.identifier}</div>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Color</label>
                        <input
                          type="text"
                          value={device.color || ''}
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
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Storage (GB)</label>
                        <select
                          value={device.storage_gb || ''}
                          onChange={(e) => updateDevice(device.identifier, 'storage_gb', e.target.value)}
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
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Grade</label>
                        <select
                          value={device.grade_id || ''}
                          onChange={(e) => updateDevice(device.identifier, 'grade_id', e.target.value)}
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
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || deviceEntries.length === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Devices...
                </>
              ) : (
                'Add Devices'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPurchaseOrderDevices;
