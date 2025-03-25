import React from 'react';
import { Package, Smartphone, ShoppingCart, ClipboardList } from 'lucide-react';

const stats = [
  { name: 'Total Devices', value: '0', icon: Smartphone },
  { name: 'Parts in Stock', value: '0', icon: Package },
  { name: 'Pending Orders', value: '0', icon: ShoppingCart },
  { name: 'Recent Sales', value: '0', icon: ClipboardList },
];

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
            >
              <dt>
                <div className="absolute bg-blue-500 rounded-md p-3">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                  {item.name}
                </p>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
              </dd>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <p className="mt-4 text-gray-500">No recent activity</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Pending Tasks</h2>
          <p className="mt-4 text-gray-500">No pending tasks</p>
        </div>
      </div>
    </div>
  );
}
