import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Filter, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddSalesOrderDevicesProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicesAdded: () => void;
  salesOrderId: string;
}

interface DeviceEntry {
  id: string;
  cellular_device_id?: string;
  serial_device_id?: string;
  identifier: string;
  manufacturer: string;
  model: string;
  color?: string;
  storage_gb?: number;
  grade?: string;
  type: 'cellular' | 'serial';
  selected: boolean;
}

interface FilterOptions {
  manufacturer: string;
  model: string;
  searchQuery: string;
}

const AddSalesOrderDevices: React.FC<AddSalesOrderDevicesProps> = ({
  isOpen,
  onClose,
  onDevicesAdded,
  salesOrderId,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; supplier_code: string }[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<DeviceEntry[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<DeviceEntry[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    manufacturer: '',
    model: '',
    searchQuery: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      setSelectedSupplierId('');
      setAvailableDevices([]);
      setSelectedDevices([]);
      setFilterOptions({
        manufacturer: '',
        model: '',
        searchQuery: '',
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSupplierId) {
      loadAvailableDevices();
    }
  }, [selectedSupplierId]);

  useEffect(() => {
    if (availableDevices.length > 0) {
      const uniqueManufacturers = Array.from(
        new Set(availableDevices.map(device => device.manufacturer))
      ).sort();
      setManufacturers(uniqueManufacturers);
    }
  }, [availableDevices]);

  useEffect(() => {
    if (filterOptions.manufacturer) {
      const uniqueModels = Array.from(
        new Set(
          availableDevices
            .filter(device => device.manufacturer === filterOptions.manufacturer)
            .map(device => device.model)
        )
      ).sort();
      setModels(uniqueModels);
    } else {
      setModels([]);
    }
  }, [filterOptions.manufacturer, availableDevices]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, supplier_code')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Failed to load suppliers');
    }
  };

  const loadAvailableDevices = async () => {
    setLoadingDevices(true);
    try {
      // Load cellular devices
      const { data: cellularData, error: cellularError } = await supabase
        .from('cellular_devices')
        .select(`
          id,
          imei,
          color,
          storage_gb,
          grade_id,
          status,
          tac:tac_codes(
            manufacturer,
            model_name
          ),
          grade:product_grades(
            grade
          )
        `)
        .eq('status', 'in_stock')
        .eq('supplier_id', selectedSupplierId);

      if (cellularError) throw cellularError;

      // Load serial devices
      const { data: serialData, error: serialError } = await supabase
        .from('serial_devices')
        .select(`
          id,
          serial_number,
          color,
          grade_id,
          status,
          model_name,
          manufacturer:manufacturers(
            name
          ),
          grade:product_grades(
            grade
          )
        `)
        .eq('status', 'in_stock')
        .eq('supplier_id', selectedSupplierId);

      if (serialError) throw serialError;

      // Format cellular devices
      const cellularDevices: DeviceEntry[] = (cellularData || []).map(device => ({
        id: device.id,
        cellular_device_id: device.id,
        identifier: device.imei,
        type: 'cellular',
        manufacturer: device.tac?.manufacturer || 'Unknown',
        model: device.tac?.model_name || 'Unknown',
        color: device.color,
        storage_gb: device.storage_gb,
        grade: device.grade?.grade,
        selected: false,
      }));

      // Format serial devices
      const serialDevices: DeviceEntry[] = (serialData || []).map(device => ({
        id: device.id,
        serial_device_id: device.id,
        identifier: device.serial_number,
        type: 'serial',
        manufacturer: device.manufacturer?.name || 'Unknown',
        model: device.model_name || 'Unknown',
        color: device.color,
        grade: device.grade?.grade,
        selected: false,
      }));

      // Combine and set available devices
      setAvailableDevices([...cellularDevices, ...serialDevices]);
    } catch (err) {
      console.error('Error loading devices:', err);
      setError('Failed to load available devices');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleDeviceSelection = (deviceId: string) => {
    setAvailableDevices(prevDevices =>
      prevDevices.map(device => {
        if (device.id === deviceId) {
          const updatedDevice = { ...device, selected: !device.selected };
          
          if (updatedDevice.selected) {
            setSelectedDevices(prev => [...prev, updatedDevice]);
          } else {
            setSelectedDevices(prev => prev.filter(d => d.id !== deviceId));
          }
          
          return updatedDevice;
        }
        return device;
      })
    );
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setFilterOptions(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'manufacturer') {
        updated.model = '';
      }
      
      return updated;
    });
  };

  const filteredDevices = availableDevices.filter(device => {
    const matchesManufacturer = !filterOptions.manufacturer || device.manufacturer === filterOptions.manufacturer;
    const matchesModel = !filterOptions.model || device.model === filterOptions.model;
    const matchesSearch = !filterOptions.searchQuery || 
      device.identifier.toLowerCase().includes(filterOptions.searchQuery.toLowerCase()) ||
      device.manufacturer.toLowerCase().includes(filterOptions.searchQuery.toLowerCase()) ||
      device.model.toLowerCase().includes(filterOptions.searchQuery.toLowerCase());
    
    return matchesManufacturer && matchesModel && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (selectedDevices.length === 0) {
        throw new Error('Please select at least one device');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create sales order devices entries
      const salesOrderDevices = selectedDevices.map(device => ({
        sales_order_id: salesOrderId,
        cellular_device_id: device.type === 'cellular' ? device.id : null,
        serial_device_id: device.type === 'serial' ? device.id : null,
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: insertError } = await supabase
        .from('sales_order_devices')
        .insert(salesOrderDevices);

      if (insertError) throw insertError;

      // Update device status to 'sold'
      for (const device of selectedDevices) {
        const { error: updateError } = await supabase
          .from(device.type === 'cellular' ? 'cellular_devices' : 'serial_devices')
          .update({
            status: 'sold',
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', device.id);

        if (updateError) throw updateError;
      }

      onDevicesAdded();
      onClose();
    } catch (err) {
      console.error('Error adding devices to sales order:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Devices to Sales Order</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Supplier
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.supplier_code})
              </option>
            ))}
          </select>
        </div>

        {selectedSupplierId && (
          <>
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Devices</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Search</label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={filterOptions.searchQuery}
                      onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Search IMEI, manufacturer, model..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                  <select
                    value={filterOptions.manufacturer}
                    onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All Manufacturers</option>
                    {manufacturers.map((manufacturer) => (
                      <option key={manufacturer} value={manufacturer}>
                        {manufacturer}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model</label>
                  <select
                    value={filterOptions.model}
                    onChange={(e) => handleFilterChange('model', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={!filterOptions.manufacturer}
                  >
                    <option value="">All Models</option>
                    {models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Available Devices</h3>
                <span className="text-sm text-gray-500">
                  {selectedDevices.length} selected
                </span>
              </div>

              {loadingDevices ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="ml-2">Loading devices...</span>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No devices available from this supplier</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IMEI/Serial
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manufacturer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Model
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Color
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Storage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDevices.map((device) => (
                        <tr 
                          key={device.id} 
                          className={`hover:bg-gray-50 ${device.selected ? 'bg-blue-50' : ''}`}
                          onClick={() => handleDeviceSelection(device.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={device.selected}
                                onChange={() => {}} // Handled by row click
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {device.identifier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.manufacturer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.model}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.color || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.storage_gb ? `${device.storage_gb}GB` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.grade ? `Grade ${device.grade}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedDevices.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Selected Devices ({selectedDevices.length})</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {selectedDevices.map((device) => (
                      <div 
                        key={device.id} 
                        className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span className="mr-1">{device.identifier}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeviceSelection(device.id);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

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
            disabled={loading || selectedDevices.length === 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Add Selected Devices
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSalesOrderDevices;
