import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Package, Smartphone, Barcode, CheckCircle2, XCircle, AlertCircle, Clock, PenTool as Tool, Tag, CheckSquare, ClipboardCheck, Truck } from 'lucide-react';
import AddSalesOrderDevices from '../components/AddSalesOrderDevices';

interface SalesOrder {
  id: string;
  order_number: string;
  customer: {
    name: string;
    customer_code: string;
  };
  order_date: string;
  status: 'draft' | 'pending' | 'processing' | 'complete' | 'cancelled';
  tracking_number?: string;
  shipping_carrier?: string;
  total_boxes?: number;
  total_pallets?: number;
  notes?: string;
}

interface Device {
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
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const SalesOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDevicesModalOpen, setIsAddDevicesModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadSalesOrder();
      loadDevices();
    }
  }, [id]);

  const loadSalesOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(
            name,
            customer_code
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error loading sales order:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_order_devices')
        .select(`
          *,
          cellular_device:cellular_devices(
            id,
            imei,
            color,
            storage_gb,
            grade:product_grades(grade),
            tac:tac_codes(
              model_name,
              manufacturer
            )
          ),
          serial_device:serial_devices(
            id,
            serial_number,
            color,
            grade:product_grades(grade),
            model_name,
            manufacturer:manufacturers(name)
          )
        `)
        .eq('sales_order_id', id);

      if (error) throw error;

      const formattedDevices = (data || []).map(device => ({
        id: device.id,
        cellular_device_id: device.cellular_device?.id,
        serial_device_id: device.serial_device?.id,
        identifier: device.cellular_device ? device.cellular_device.imei : device.serial_device.serial_number,
        manufacturer: device.cellular_device 
          ? device.cellular_device.tac.manufacturer
          : device.serial_device.manufacturer.name,
        model: device.cellular_device 
          ? device.cellular_device.tac.model_name 
          : device.serial_device.model_name,
        color: device.cellular_device?.color || device.serial_device?.color,
        storage_gb: device.cellular_device?.storage_gb,
        grade: device.cellular_device?.grade?.grade || device.serial_device?.grade?.grade,
        type: device.cellular_device ? 'cellular' : 'serial'
      }));

      setDevices(formattedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/sales')}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Sales Orders
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Sales Order: {order.order_number}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {order.customer.name} ({order.customer.customer_code})
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Order Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(order.order_date).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Device Count</dt>
              <dd className="mt-1 text-sm text-gray-900">{devices.length}</dd>
            </div>
            {order.tracking_number && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tracking</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {order.tracking_number} ({order.shipping_carrier})
                </dd>
              </div>
            )}
          </div>
          {order.notes && (
             <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500">Notes</dt>
              <dd className="mt-1 text-sm text-gray-900">{order.notes}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Devices</h3>
          {order.status === 'draft' && (
            <button
              type="button"
              onClick={() => setIsAddDevicesModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Package className="mr-2 h-4 w-4" />
              Add Devices
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device Info
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No devices added yet
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {device.type === 'cellular' ? (
                          <Smartphone className="h-5 w-5 text-gray-400 mr-3" />
                        ) : (
                          <Barcode className="h-5 w-5 text-gray-400 mr-3" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {device.manufacturer} {device.model}
                          </div>
                          <div className="text-sm text-gray-500">
                            <Link 
                              to={`/device/${device.type}/${device.type === 'cellular' ? device.cellular_device_id : device.serial_device_id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {device.identifier}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {device.color || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {device.storage_gb ? `${device.storage_gb}GB` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {device.grade ? `Grade ${device.grade}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <Link 
                        to={`/device/${device.type}/${device.type === 'cellular' ? device.cellular_device_id : device.serial_device_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddSalesOrderDevices
        isOpen={isAddDevicesModalOpen}
        onClose={() => setIsAddDevicesModalOpen(false)}
        onDevicesAdded={loadDevices}
        salesOrderId={id!}
      />
    </div>
  );
};

export default SalesOrderDetail;
