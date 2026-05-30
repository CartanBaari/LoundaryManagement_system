import React from 'react';

export const Table = ({ children, className = '' }) => (
  <div className={`w-full overflow-x-auto ${className}`}>
    <table className="w-full">
      {children}
    </table>
  </div>
);

export const TableHead = ({ children, className = '' }) => (
  <thead className={`bg-gray-50 border-b border-gray-200 ${className}`}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-gray-200 ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '' }) => (
  <tr className={`hover:bg-gray-50 transition-colors ${className}`}>
    {children}
  </tr>
);

export const TableHeader = ({ children, className = '' }) => (
  <th className={`px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${className}`}>
    {children}
  </td>
);
