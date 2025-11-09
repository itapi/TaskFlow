import React, { useRef, useEffect, useCallback, useState } from "react";
import PropTypes from "prop-types";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Cell } from "./Cell";

export const Table = ({
  tableConfig,
  onLoadMore,
  hasMore = false,
  onUpdateData,
  onSelectionChange,
  selectable = false,
  stickyHeader = false,
  loading = false,
  onSortChange,
  sortColumn: externalSortColumn = null,
  sortDirection: externalSortDirection = 'asc',
}) => {
  const { columns, data, onRowClick } = tableConfig;
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Add a local state to manage data updates
  const [localData, setLocalData] = useState(data || []);
  
  // State to track selected rows
  const [selectedRows, setSelectedRows] = useState({});
  // Track if all rows are selected
  const [selectAll, setSelectAll] = useState(false);

  // Use external sorting state if provided
  const sortColumn = externalSortColumn;
  const sortDirection = externalSortDirection;

  // Update local data when props change
  useEffect(() => {
    setLocalData(data || []);
  }, [data]);

  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, loading]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Function to handle data updates from Cell components
  const handleDataUpdate = (success, rowId, field, value) => {
    if (!success) {
      if (onUpdateData) {
        onUpdateData(success, rowId, field, value, null);
      }
      return;
    }

    // Update local data
    const updatedData = localData.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    );

    setLocalData(updatedData);

    // Propagate changes upward
    if (onUpdateData) {
      onUpdateData(success, rowId, field, value, updatedData);
    }
  };

  // Function to handle row click (if provided)
  const handleRowClick = (row, event) => {
    // Don't trigger row click when clicking on checkboxes or editable cells
    if (
      event.target.type === 'checkbox' ||
      event.target.closest('.editable-cell') ||
      !onRowClick
    ) {
      return;
    }

    // Don't trigger row click if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // Don't trigger row click if this might be the start of a text selection
    if (event.detail > 1) {
      return;
    }

    onRowClick(row);
  };

  // Handle checkbox selection for a single row
  const handleRowSelection = (rowId) => {
    const newSelectedRows = { ...selectedRows };
    
    if (newSelectedRows[rowId]) {
      delete newSelectedRows[rowId];
    } else {
      newSelectedRows[rowId] = true;
    }
    
    setSelectedRows(newSelectedRows);
    
    // Update selectAll state based on whether all rows are selected
    setSelectAll(Object.keys(newSelectedRows).length === localData.length);
    
    // Notify parent component about selection change
    if (onSelectionChange) {
      onSelectionChange(Object.keys(newSelectedRows).map(id => id));
    }
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    let newSelectedRows = {};

    if (newSelectAll) {
      // Select all rows
      localData.forEach(row => {
        newSelectedRows[row.id] = true;
      });
    }

    setSelectAll(newSelectAll);
    setSelectedRows(newSelectedRows);

    // Notify parent component about selection change
    if (onSelectionChange) {
      onSelectionChange(Object.keys(newSelectedRows).map(id => id));
    }
  };

  // Handle column sort - notify parent to refetch data
  const handleSort = (column) => {
    if (!column.sortable || !onSortChange) return;

    const columnKey = column.sortKey || column.key || column.id;

    if (sortColumn === columnKey) {
      // Toggle direction if clicking the same column
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(columnKey, newDirection);
    } else {
      // Set new column and default to ascending
      onSortChange(columnKey, 'asc');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-gray-50 ${stickyHeader ? "sticky top-0 " : ""}`}>
            <tr>
              {/* Checkbox column for select all */}
              {selectable && (
                <th className="w-12 px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => {
                const columnKey = column.sortKey || column.key || column.id;
                const isSorted = sortColumn === columnKey;
                const isSortable = column.sortable;

                return (
                  <th
                    key={column.id}
                    className={`px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      isSortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''
                    }`}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center justify-end space-x-reverse space-x-1">
                      <span>{column.label}</span>
                      {isSortable && (
                        <span className="mr-1">
                          {!isSorted && (
                            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          {isSorted && sortDirection === 'asc' && (
                            <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          {isSorted && sortDirection === 'desc' && (
                            <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {localData?.length > 0 &&
              localData.map((row, index) => (
                <tr
                  key={row.id}
                  className={`transition-colors duration-200 cursor-pointer ${
                    selectedRows[row.id] 
                      ? 'bg-purple-50 hover:bg-purple-100' 
                      : index % 2 === 0 
                        ? 'bg-white hover:bg-gray-50' 
                        : 'bg-gray-25 hover:bg-gray-75'
                  }`}
                  onClick={(e) => handleRowClick(row, e)}
                >
                  {/* Checkbox for row selection */}
                  {selectable && (
                    <td className="w-12 px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                        checked={!!selectedRows[row.id]}
                        onChange={() => handleRowSelection(row.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Cell
                        row={row}
                        column={{ ...column, tableType: tableConfig.tableType }}
                        data={localData}
                        validations={column.validations}
                        onDataUpdate={handleDataUpdate}
                      />
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-reverse space-x-2">
              <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">טוען נתונים...</span>
            </div>
          </div>
        )}
        
        {/* No data message */}
        {!loading && localData?.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין נתונים להצגה</h3>
            <p className="text-gray-600">לא נמצאו רשומות התואמות לחיפוש</p>
          </div>
        )}
      </div>
      
      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="h-1" />
    </div>
  );
};

Table.propTypes = {
  tableConfig: PropTypes.shape({
    columns: PropTypes.array,
    data: PropTypes.array,
    onRowClick: PropTypes.func,
    tableType: PropTypes.string,
  }),
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  onUpdateData: PropTypes.func,
  onSelectionChange: PropTypes.func,
  selectable: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  loading: PropTypes.bool,
  onSortChange: PropTypes.func,
  sortColumn: PropTypes.string,
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
};