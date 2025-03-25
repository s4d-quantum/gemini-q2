import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DeviceStatus } from '../types/database';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceAdded: () => void;
  deviceType: 'cellular' | 'serial';
}

interface DeviceConfig {
  available_colors: string[];
  storage_options: number[];
}

const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceAdded,
  deviceType,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [manufacturers, setManufacturers] = useState<{ id: string; name: string }[]>([]);
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    identifier: '', // IMEI or Serial Number
    manufacturer: '',
    model: '',
    color: '',
    storage: '',
    grade: '',
    status: 'in_stock' as DeviceStatus,
    location: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadManufacturers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.manufacturer && formData.model) {
      loadDeviceConfig();
    }
  }, [formData.manufacturer, formData.model]);

  const loadManufacturers = async () => {
    try {
      const { data, error } = await supabase
        .from('manufacturers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setManufacturers(data || []);
    } catch (err) {
      console.error('Error loading manufacturers:', err);
    }
  };

  const loadDeviceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('device_configurations')
        .select('available_colors, storage_options')
        .eq('manufacturer', formData.manufacturer)
        .eq('model_name', formData.model)
        .single();

      if (error) throw error;
      setDeviceConfig(data);
      
      // Reset color and storage when configurations change
      setFormData(prev => ({
        ...prev,
        color: '',
        storage: ''
      }));
    } catch (err) {
      console.error('Error loading device configuration:', err);
      setDeviceConfig(null);
    }
  };

  const handleManufacturerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const manufacturerId = e.target.value;
    const manufacturer = manufacturers.find(m => m.id === manufacturerId);
    setFormData({ ...formData, manufacturer: manufacturer?.name || '', model: '' });
    setModels([]);

    if (manufacturerId) {
      setManufacturerId(manufacturerId);
      try {
        const { data: modelData, error: modelError } = await supabase
          .from('tac_codes')
          .select('DISTINCT model_name')
          .eq('manufacturer_id', manufacturerId)
          .order('model_name');

        if (modelError) throw modelError;
        setModels(Array.from(new Set(modelData?.map(m => m.model_name) || [])));
      } catch (err) {
        console.error('Error fetching models:', err);
        setModels([]);
      }
    } else {
      setManufacturerId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (deviceType === 'cellular') {
        // Validate IMEI format
        if (!/^\d{15}$/.test(formData.identifier)) {
          throw new Error('IMEI must be exactly 15 digits');
        }

        // First, create or get TAC code entry
        const tacCode = formData.identifier.slice(0, 8);
        const { data: manufacturer } = await supabase
          .from('manufacturers')
          .select('id')
          .eq('name', formData.manufacturer)
          .single();

        if (!manufacturer) {
          throw new Error('Manufacturer not found');
        }

        const { data: tacData, error: tacError } = await supabase
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
              manufacturer_id: manufacturer.id,
              model_name: formData.model,
            })
            .select('id')
            .single();

          if (createTacError) throw createTacError;
          tacId = newTac.id;
        } else {
          tacId = tacData.id;
        }

        // Create cellular device
        const { error: deviceError } = await supabase
          .from('cellular_devices')
          .insert({
            imei: formData.identifier,
            tac_id: tacId,
            color: formData.color || null,
            storage_gb: formData.storage ? parseInt(formData.storage) : null,
            grade_id: formData.grade || null,
            status: formData.status,
            location_id: formData.location || null,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (deviceError) throw deviceError;
      } else {
        // Create serial device
        const { data: manufacturer } = await supabase
          .from('manufacturers')
          .select('id')
          .eq('name', formData.manufacturer)
          .single();

        if (!manufacturer) {
          throw new Error('Manufacturer not found');
        }

        const { error: deviceError } = await supabase
          .from('serial_devices')
          .insert({
            serial_number: formData.identifier,
            manufacturer_id: manufacturer.id,
            model_name: formData.model,
            color: formData.color || null,
            grade_id: formData.grade || null,
            status: formData.status,
            location_id: formData.location || null,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (deviceError) throw deviceError;
      }

      onDeviceAdded();
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
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Add {deviceType === 'cellular' ? 'IMEI' : 'Serial'} Device
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {deviceType === 'cellular' ? 'IMEI' : 'Serial Number'}
            </label>
            <input
              type="text"
              value={formData.identifier}
              onChange={(e) =>
                setFormData({ ...formData, identifier: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Manufacturer
            </label>
            <select
              value={manufacturerId || ''}
              onChange={handleManufacturerChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select Manufacturer</option>
              {manufacturers.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Model
            </label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={!manufacturerId || models.length === 0}
            >
              <option value="">Select Model</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Color
              </label>
              <select
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={!deviceConfig}
              >
                <option value="">Select Color</option>
                {deviceConfig?.available_colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>

            {deviceType === 'cellular' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Storage (GB)
                </label>
                <select
                  value={formData.storage}
                  onChange={(e) =>
                    setFormData({ ...formData, storage: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!deviceConfig}
                >
                  <option value="">Select Storage</option>
                  {deviceConfig?.storage_options.map((storage) => (
                    <option key={storage} value={storage}>
                      {storage}GB
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Grade
              </label>
              <select
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as DeviceStatus,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="in_stock">In Stock</option>
                <option value="quarantine">Quarantine</option>
                <option value="qc_required">QC Required</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDeviceModal;
