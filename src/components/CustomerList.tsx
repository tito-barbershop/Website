import { useState, useEffect } from 'react';
import type { Customer } from '../types';
import { Card } from './ui/Card';
import { getCustomers } from '../services/customerService';

interface CustomerListProps {
  ownerId: string;
}

export function CustomerList({ ownerId }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [ownerId]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers(ownerId);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

  if (loading) {
    return <div className="text-center text-gray-600">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">
            {customers.length === 0
              ? 'No customers yet'
              : 'No customers match your search'}
          </p>
        </Card>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="text-center bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-900">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-900">
                    Appointments
                  </th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-900">
                    Completed Appointments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((customer) => (
                  <tr key={customer.id} className=" text-center hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {customer.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {customer.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {customer.appointmentsCount || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {customer.completedAppointmentsCount || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((customer) => (
              <Card key={customer.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {customer.appointmentsCount || 0} appointments
                    </span>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      {customer.completedAppointmentsCount || 0} completed
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline block truncate"
                    >
                      📧 {customer.email}
                    </a>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline block"
                    >
                      📞 {customer.phone}
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
