import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Package, Smartphone, Barcode, CheckCircle2, XCircle, AlertCircle, Clock, PenTool as Tool, Tag, CheckSquare, ClipboardCheck } from 'lucide-react';
import AddPurchaseOrderDevices from '../components/AddPurchaseOrderDevices';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: {
    name: string;
    supplier_code: string;
  };
  order_date: string;
  status: 'draft' | 'pending' | 'processing' | 'complete' | 'cancelled' | 'confirmed';
  requires_qc: boolean;
  requires_repair: boolean;
  qc_completed: boolean;
  repair_completed: boolean;
  purchase_return: boolean;
  has_return_tag: boolean;
  unit_confirmed: boolean;
  priority: number;
  notes: string;
}

interface Device {
  id: string;
  cellular_device_id?: string;
  serial_device_id?: string;
  identifier: string;
  manufacturer: string;
  model: string;
  tray_id: string;
  qc_required: boolean;
  qc_completed: boolean;
  repair_required: boolean;
  repair_completed: boolean;
  return_tag: boolean;
  unit_confirmed: boolean;
  type: 'cellular' | 'serial';
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  complete: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityColors = {
  1: 'bg-red-100 text-red-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-blue-100 text-blue-800',
  4: 'bg-green-100 text-green-800',
  5: 'bg-gray-100 text-gray-800',
};

const PurchaseOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDevicesModalOpen, setIsAddDevicesModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPurchaseOrder();
      loadDevices();
    }
  }, [id]);

  const loadPurchaseOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(
            name,
            supplier_code
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error loading purchase order:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_devices')
        .select(`
          *,
          cellular_device:cellular_devices(
            id,
            imei,
            tac:tac_codes(
              model_name,
              manufacturer
            )
          ),
          serial_device:serial_devices(
            id,
            serial_number,
            model_name,
            manufacturer:manufacturers(name)
          )
        `)
        .eq('purchase_order_id', id);

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
        tray_id: device.tray_id,
        qc_required: device.qc_required,
        qc_completed: device.qc_completed,
        repair_required: device.repair_required,
        repair_completed: device.repair_completed,
        return_tag: device.return_tag,
        unit_confirmed: device.unit_confirmed,
        type: device.cellular_device ? 'cellular' : 'serial'
      }));

      setDevices(formattedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!order || !id) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate that devices have been added
      if (devices.length === 0) {
        throw new Error('Cannot confirm purchase order with no devices');
      }

      // Update purchase order status to confirmed
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'confirmed',
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Refresh the order data
      await loadPurchaseOrder();

      // Show success message and redirect
      navigate('/purchases', { 
        state: { message: `Purchase Order ${order.po_number} has been confirmed successfully` }
      });
    } catch (err) {
      console.error('Error confirming purchase order:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while confirming the purchase order');
    } finally {
      setIsSubmitting(false);
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

  const canComplete = order.status !== 'confirmed' && order.status !== 'cancelled';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/purchases')}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Purchase Orders
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Purchase Order: {order.po_number}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {order.supplier.name} ({order.supplier.supplier_code})
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[order.priority as keyof typeof priorityColors]}`}>
              Priority {order.priority}
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
            <div>
              <dt className="text-sm font-medium text-gray-500">Requirements</dt>
              <dd className="mt-1 flex space-x-2">
                {order.requires_qc && (
                  <span className="inline-flex items-center text-sm">
                    {order.qc_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="ml-1">QC</span>
                  </span>
                )}
                {order.requires_repair && (
                  <span className="inline-flex items-center text-sm">
                    {order.repair_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="ml-1">Repair</span>
                  </span>
                )}
              </dd>
            </div>
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
          {order.status !== 'confirmed' && (
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
                  Tray
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => (
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
                    {device.tray_id || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {device.qc_required && (
                        <span className="inline-flex items-center" title="QC Status">
                          {device.qc_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                        </span>
                      )}
                      {device.repair_required && (
                        <span className="inline-flex items-center" title="Repair Status">
                          {device.repair_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                        </span>
                      )}
                      {device.return_tag && (
                        <Tag className="h-5 w-5 text-blue-500" />
                      )}
                      {device.unit_confirmed && (
                        <CheckSquare className="h-5 w-5 text-green-500" />
                      )}
                    </div>
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Confirm and Save Section */}
        {canComplete && devices.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Confirm and Save
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <AddPurchaseOrderDevices
        isOpen={isAddDevicesModalOpen}
        onClose={() => setIsAddDevicesModalOpen(false)}
        onDevicesAdded={loadDevices}
        purchaseOrderId={id!}
      />
    </div>
  );
};

export default PurchaseOrderDetail;
