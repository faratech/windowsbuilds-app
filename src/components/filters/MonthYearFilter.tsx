import React from 'react';

interface MonthYearFilterProps {
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}

const months = [
  'All',
  'Last 60 Days',
  'Last 30 Days',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const years = ['All', ...Array.from({ length: 10 }, (_, i) => String(currentYear - i))];

export const MonthYearFilter: React.FC<MonthYearFilterProps> = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange
}) => {
  return (
    <div className="flex gap-4">
      <div className="filter-group">
        <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Month:
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {months.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Year:
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    </div>
  );
};