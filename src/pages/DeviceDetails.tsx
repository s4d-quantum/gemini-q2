import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Package, CheckCircle2, XCircle, AlertCircle, Clock, PenTool as Tool, Tag, CheckSquare } from 'lucide-react';
import { DeviceStatus } from '../types/database';

interface DeviceDetails {
  id: string;
  type: 'cellular' | 'serial';
  identifier: string;
  manufacturer: string;
  model_name: string;
  model_no?: string;
  color?: string;
  storage_gb?: number;
  grade?: {
    grade: string;
    description: string;
  };
  status: DeviceStatus;
  location?: {
    location_code: string;
    description: string;
  };
  purchase_order?: {
    id: string;
    po_number: string;
    supplier: {
      name: string;
      supplier_code: string;
    };
  };
  qc_required: boolean;
  qc_completed: boolean;
  qc_status?: 'pass' | 'fail';
  repair_required: boolean;
  repair_completed: boolean;
  qc_comments?: string;
}

interface DeviceHistory {
  id: string;
  date: string;
  operation: string;
  user: {
    full_name: string;
  };
  details?: string;
}

const DeviceDetails: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceDetails | null>(null);
  const [history, setHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && type) {
      loadDeviceDetails();
      loadDeviceHistory();
    }
  }, [id, type]);

  const loadDeviceDetails = async () => {
    try {
      if (type === 'cellular') {
        const { data, error } = await supabase
          .from('cellular_devices')
          .select(`
            *,
            tac:tac_codes(
              manufacturer,
              model_name,
              model_no
            ),
            grade:product_grades(
              grade,
              description
            ),
            location:storage_locations(
              location_code,
              description
            ),
            purchase_order:purchase_order_devices!cellular_device_id(
              purchase_order:purchase_orders(
                id,
                po_number,
                supplier:suppliers(
                  name,
                  supplier_code
                )
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (!data) {
          setError('Device not found');
          return;
        }

        setDevice({
          id: data.id,
          type: 'cellular',
          identifier: data.imei,
          manufacturer: data.tac.manufacturer,
          model_name: data.tac.model_name,
          model_no: data.tac.model_no,
          color: data.color,
          storage_gb: data.storage_gb,
          grade: data.grade,
          status: data.status,
          location: data.location,
          purchase_order: data.purchase_order?.[0]?.purchase_order,
          qc_required: data.qc_required || false,
          qc_completed: data.qc_completed || false,
          qc_status: data.qc_status,
          repair_required: data.repair_required || false,
          repair_completed: data.repair_completed || false,
          qc_comments: data.qc_comments
        });
      } else {
        // Handle serial devices similarly
        const { data, error } = await supabase
          .from('serial_devices')
          .select(`
            *,
            manufacturer:manufacturers(name),
            grade:product_grades(
              grade,
              description
            ),
            location:storage_locations(
              location_code,
              description
            ),
            purchase_order:purchase_order_devices!serial_device_id(
              purchase_order:purchase_orders(
                id,
                po_number,
                supplier:suppliers(
                  name,
                  supplier_code
                )
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (!data) {
          setError('Device not found');
          return;
        }

        setDevice({
          id: data.id,
          type: 'serial',
          identifier: data.serial_number,
          manufacturer: data.manufacturer.name,
          model_name: data.model_name,
          color: data.color,
          grade: data.grade,
          status: data.status,
          location: data.location,
          purchase_order: data.purchase_order?.[0]?.purchase_order,
          qc_required: data.qc_required || false,
          qc_completed: data.qc_completed || false,
          qc_status: data.qc_status,
          repair_required: data.repair_required || false,
          repair_completed: data.repair_completed || false,
          qc_comments: data.qc_comments
        });
      }
    } catch (err) {
      console.error('Error loading device details:', err);
      setError('Failed to load device details');
    }
  };

  const loadDeviceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from(type === 'cellular' ? 'cellular_device_transactions' : 'serial_device_transactions')
        .select(`
          id,
          created_at,
          transaction_type,
          previous_status,
          new_status,
          notes,
          user:users!created_by(
            full_name
          )
        `)
        .eq('device_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setHistory(data.map(entry => ({
          id: entry.id,
          date: entry.created_at,
          operation: `${entry.transaction_type.replace('_', ' ')} (${entry.previous_status} → ${entry.new_status})`,
          user: entry.user,
          details: entry.notes
        })));
      }
    } catch (error) {
      console.error('Error loading device history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </button>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h2 className="text-lg font-medium">
                {error || 'Device not found'}
              </h2>
            </div>
            <p className="mt-2 text-gray-600">
              The device you're looking for could not be found. It may have been removed or you may have followed an invalid link.
            </p>
            <button
              onClick={() => navigate('/inventory')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Return to Inventory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Device Details
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {device.type === 'cellular' ? 'IMEI' : 'Serial'}: {device.identifier}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {device.qc_required && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                QC Required
              </span>
            )}
            {device.repair_required && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Repair Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Device Information */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Device Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Manufacturer</dt>
              <dd className="mt-1 text-sm text-gray-900">{device.manufacturer}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Model</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {device.model_name}
                {device.model_no && <span className="text-gray-500 ml-1">({device.model_no})</span>}
              </dd>
            </div>
            {device.color && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Color</dt>
                <dd className="mt-1 text-sm text-gray-900">{device.color}</dd>
              </div>
            )}
            {device.storage_gb && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Storage</dt>
                <dd className="mt-1 text-sm text-gray-900">{device.storage_gb}GB</dd>
              </div>
            )}
            {device.grade && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Grade</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Grade {device.grade.grade}
                  <span className="text-gray-500 ml-1">({device.grade.description})</span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{device.status}</dd>
            </div>
            {device.location && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {device.location.location_code}
                  {device.location.description && (
                    <span className="text-gray-500 ml-1">({device.location.description})</span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Purchase Order</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {device.purchase_order ? (
                  <Link 
                    to={`/purchases/${device.purchase_order.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {device.purchase_order.po_number}
                  </Link>
                ) : (
                  'N/A'
                )}
              </dd>
            </div>
          </div>

          {/* QC Information */}
          {(device.qc_required || device.repair_required) && (
            <div className="mt-8">
              <h4 className="text-md font-medium text-gray-900 mb-4">QC & Repair Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {device.qc_required && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">QC Status</dt>
                      <dd className="mt-1 flex items-center text-sm">
                        {device.qc_completed ? (
                          device.qc_status === 'pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mr-1" />
                          )
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500 mr-1" />
                        )}
                        {device.qc_completed ? (
                          device.qc_status === 'pass' ? 'Passed' : 'Failed'
                        ) : 'Pending'}
                      </dd>
                    </div>
                  </>
                )}
                {device.repair_required && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Repair Status</dt>
                    <dd className="mt-1 flex items-center text-sm">
                      {device.repair_completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-1" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500 mr-1" />
                      )}
                      {device.repair_completed ? 'Completed' : 'Pending'}
                    </dd>
                  </div>
                )}
              </div>
              {device.qc_comments && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500">QC/Engineer Comments</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {device.qc_comments}
                  </dd>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Device History */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Device History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No history available
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.operation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.user.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetails;
