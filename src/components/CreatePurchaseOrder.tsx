import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreatePurchaseOrderProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

interface Supplier {
  id: string;
  name: string;
  supplier_code: string;
}

const CreatePurchaseOrder: React.FC<CreatePurchaseOrderProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    po_number: '',
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    requires_qc: false,
    requires_repair: false,
    priority: 3,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, supplier_code')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setError('Failed to load suppliers. Please try again.');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate PO number format
      if (!/^PO-\d{6}$/.test(formData.po_number)) {
        throw new Error('PO number must be in format PO-XXXXXX (e.g., PO-123456)');
      }

      // Check if PO number already exists
      const { data: existingPO } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('po_number', formData.po_number)
        .single();

      if (existingPO) {
        throw new Error('Purchase order number already exists');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: createError } = await supabase
        .from('purchase_orders')
        .insert({
          ...formData,
          status: 'draft',
          created_by: user.id,
          updated_by: user.id
        });

      if (createError) throw createError;

      onOrderCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      po_number: '',
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
      requires_qc: false,
      requires_repair: false,
      priority: 3,
      notes: '',
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create Purchase Order</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              PO Number
            </label>
            <input
              type="text"
              value={formData.po_number}
              onChange={(e) =>
                setFormData({ ...formData, po_number: e.target.value })
              }
              placeholder="PO-XXXXXX"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Format: PO-XXXXXX (e.g., PO-123456)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier
            </label>
            {loadingSuppliers ? (
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading suppliers...
              </div>
            ) : (
              <select
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.supplier_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Order Date
            </label>
            <input
              type="date"
              value={formData.order_date}
              onChange={(e) =>
                setFormData({ ...formData, order_date: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="1">P1 - Critical</option>
              <option value="2">P2 - High</option>
              <option value="3">P3 - Normal</option>
              <option value="4">P4 - Low</option>
              <option value="5">P5 - Minimal</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="requires_qc"
                checked={formData.requires_qc}
                onChange={(e) =>
                  setFormData({ ...formData, requires_qc: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="requires_qc"
                className="ml-2 block text-sm text-gray-700"
              >
                Requires QC
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="requires_repair"
                checked={formData.requires_repair}
                onChange={(e) =>
                  setFormData({ ...formData, requires_repair: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="requires_repair"
                className="ml-2 block text-sm text-gray-700"
              >
                Requires Repair
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingSuppliers}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchaseOrder;
