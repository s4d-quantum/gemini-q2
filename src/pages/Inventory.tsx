import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CellularDevice, SerialDevice, DeviceStatus } from '../types/database';
import { Search, Filter, RefreshCw, Plus, Smartphone, Barcode, AlertCircle, CheckCircle2, XCircle, PenTool as Tool, ShieldQuestion, Package } from 'lucide-react';
import BookDeviceShipment from '../components/BookDeviceShipment';

type DeviceType = 'cellular' | 'serial';

const statusIcons: Record<DeviceStatus, React.ReactNode> = {
  in_stock: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  sold: <Package className="w-5 h-5 text-blue-500" />,
  returned: <RefreshCw className="w-5 h-5 text-yellow-500" />,
  quarantine: <AlertCircle className="w-5 h-5 text-red-500" />,
  repair: <Tool className="w-5 h-5 text-orange-500" />,
  qc_required: <ShieldQuestion className="w-5 h-5 text-purple-500" />,
  qc_failed: <XCircle className="w-5 h-5 text-red-500" />,
};

const statusLabels: Record<DeviceStatus, string> = {
  in_stock: 'In Stock',
  sold: 'Sold',
  returned: 'Returned',
  quarantine: 'Quarantine',
  repair: 'In Repair',
  qc_required: 'QC Required',
  qc_failed: 'QC Failed',
};

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DeviceType>('cellular');
  const [cellularDevices, setCellularDevices] = useState<CellularDevice[]>([]);
  const [serialDevices, setSerialDevices] = useState<SerialDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [activeTab]);

  async function loadDevices() {
    setLoading(true);
    try {
      if (activeTab === 'cellular') {
        const { data, error } = await supabase
          .from('cellular_devices')
          .select(`
            *,
            tac:tac_codes(
              tac_code,
              manufacturer,
              model_name
            ),
            grade:product_grades(grade, description),
            location:storage_locations(location_code, description)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCellularDevices(data || []);
      } else {
        const { data, error } = await supabase
          .from('serial_devices')
          .select(`
            *,
            manufacturer:manufacturers(name),
            grade:product_grades(grade, description),
            location:storage_locations(location_code, description)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSerialDevices(data || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredDevices = activeTab === 'cellular'
    ? cellularDevices.filter(device => 
        device.imei.includes(searchQuery) ||
        device.tac?.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.tac?.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : serialDevices.filter(device =>
        device.serial_number.includes(searchQuery) ||
        device.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.manufacturer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your device inventory, track status, and handle device operations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsBookingModalOpen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Book Devices
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cellular')}
            className={`${
              activeTab === 'cellular'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <Smartphone className="mr-2 h-5 w-5" />
            IMEI Devices
          </button>
          <button
            onClick={() => setActiveTab('serial')}
            className={`${
              activeTab === 'serial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <Barcode className="mr-2 h-5 w-5" />
            Serial Devices
          </button>
        </nav>
      </div>

      {/* Search and filters */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'cellular' ? 'IMEI' : 'serial'} devices...`}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="mr-2 h-4 w-4 text-gray-400" />
            Filters
          </button>
          <button
            onClick={loadDevices}
            type="button"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="mr-2 h-4 w-4 text-gray-400" />
            Refresh
          </button>
        </div>
      </div>

      {/* Devices table */}
      <div className="mt-6 bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading devices...
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No devices found
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device: any) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {activeTab === 'cellular'
                          ? device.tac?.manufacturer
                          : device.manufacturer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activeTab === 'cellular'
                          ? device.tac?.model_name
                          : device.model_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        <Link 
                          to={`/device/${activeTab}/${device.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {activeTab === 'cellular' ? device.imei : device.serial_number}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {statusIcons[device.status]}
                        <span className="ml-2 text-sm text-gray-900">
                          {statusLabels[device.status]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {device.location?.location_code || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4">
                      {device.grade ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Grade {device.grade.grade}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Not graded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(device.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BookDeviceShipment
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onShipmentBooked={loadDevices}
        deviceType={activeTab}
      />
    </div>
  );
};

export default Inventory;
