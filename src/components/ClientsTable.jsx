import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Tooltip } from 'react-tooltip'
import { useNavigate } from 'react-router-dom'
import apiClient from '../utils/api'
import { Table } from './Table/Table'
import { Toggle } from './Toggle'
import ConfirmModal from './Modal/ConfirmModal'
import { Modal } from './Modal/Modal'
import DebouncedSearch from './DebouncedSearch'
import { 
  Users, 
  Search, 
  Plus,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Smartphone,
  Crown,
  AlertTriangle,
  CheckCircle,
  X,
  Zap,
  Trash2
} from 'lucide-react'

const ClientsTable = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCounts, setFilterCounts] = useState({
    all: 0,
    active: 0,
    trial: 0,
    inactive: 0
  })
  const [selectedClients, setSelectedClients] = useState([])

  // Sorting state
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    client: null
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const itemsPerPage = 25

  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload data when status filter changes
  useEffect(() => {
    loadFilteredData()
  }, [statusFilter])

  // Reload data when sorting changes
  useEffect(() => {
    if (sortColumn !== null) {
      loadFilteredData()
    }
  }, [sortColumn, sortDirection])

  // Handle search term changes (debounced by component)
  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm)
    loadFilteredDataWithTerm(newSearchTerm)
  }

  const loadFilteredDataWithTerm = async (term = searchTerm) => {
    try {
      setSearchLoading(true)
      setCurrentPage(1)

      const filters = {
        plan_status: statusFilter,
        search: term,
        sort: sortColumn,
        order: sortDirection
      }

      const response = await apiClient.getClientsWithDetails(1, itemsPerPage, filters)
      
      if (response.success) {
        const responseData = response.data?.data || response.data || []
        const pagination = response.data?.pagination
        
        setClients(responseData)
        setHasMore(pagination?.has_more || false)
      }
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים')
      console.error('Error loading filtered data:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      const [clientsResponse, statsResponse] = await Promise.all([
        apiClient.getClientsWithDetails(1, itemsPerPage),
        apiClient.getClientStatistics()
      ])

      if (clientsResponse.success) {
        const responseData = clientsResponse.data?.data || clientsResponse.data || []
        const pagination = clientsResponse.data?.pagination
        
        setClients(responseData)
        setHasMore(pagination?.has_more || false)
      }

      if (statsResponse.success) {
        updateFilterCountsFromStats(statsResponse.data)
      }
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFilteredData = async () => {
    try {
      setFilterLoading(true)
      setCurrentPage(1)

      const filters = {
        plan_status: statusFilter,
        search: searchTerm,
        sort: sortColumn,
        order: sortDirection
      }

      const response = await apiClient.getClientsWithDetails(1, itemsPerPage, filters)
      
      if (response.success) {
        const responseData = response.data?.data || response.data || []
        const pagination = response.data?.pagination
        
        setClients(responseData)
        setHasMore(pagination?.has_more || false)
      }
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים')
      console.error('Error loading filtered data:', err)
    } finally {
      setFilterLoading(false)
    }
  }

  const loadMoreClients = async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = currentPage + 1

      const filters = {
        plan_status: statusFilter,
        search: searchTerm,
        sort: sortColumn,
        order: sortDirection
      }

      const response = await apiClient.getClientsWithDetails(nextPage, itemsPerPage, filters)
      
      if (response.success) {
        const responseData = response.data?.data || response.data || []
        const pagination = response.data?.pagination
        
        setClients(prev => [...prev, ...responseData])
        setHasMore(pagination?.has_more || false)
        setCurrentPage(nextPage)
      }
    } catch (err) {
      console.error('Error loading more clients:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const updateFilterCountsFromStats = (stats) => {
    const counts = {
      all: stats.totals?.all_clients || 0,
      active: stats.plan_status?.active || 0,
      trial: stats.plan_status?.trial || 0,
      inactive: (stats.plan_status?.expired || 0) + (stats.plan_status?.suspended || 0) + (stats.plan_status?.pending || 0) + (stats.plan_status?.inactive || 0)
    }
    setFilterCounts(counts)
  }

  const handleFilterChange = (filterId) => {
    setStatusFilter(filterId)
    setCurrentPage(1)
  }

  const handleClientClick = (client) => {
    navigate(`/clients/${client.client_unique_id}`, { state: { client } })
  }

  const handleStatusUpdate = async (clientUniqueId, newStatus) => {
    try {
      const response = await apiClient.updateClientStatus(clientUniqueId, newStatus)
      if (response.success) {
        setClients(prev => prev.map(client => 
          client.client_unique_id === clientUniqueId 
            ? { ...client, plan_status: newStatus }
            : client
        ))
      }
    } catch (err) {
      toast.error('שגיאה בעדכון סטטוס הלקוח')
      console.error('Error updating client status:', err)
    }
  }

  const handleDeleteClick = (client) => {
    setDeleteModal({
      isOpen: true,
      client
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.client) return
    
    try {
      const response = await apiClient.deleteClient(deleteModal.client.client_unique_id)
      if (response.success) {
        setClients(prev => prev.filter(client => 
          client.client_unique_id !== deleteModal.client.client_unique_id
        ))
        toast.success('הלקוח נמחק בהצלחה')
        setDeleteModal({ isOpen: false, client: null })
      } else {
        toast.error('שגיאה במחיקת הלקוח')
      }
    } catch (err) {
      toast.error('שגיאה במחיקת הלקוח')
      console.error('Error deleting client:', err)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, client: null })
  }

  const handleSortChange = (column, direction) => {
    setSortColumn(column)
    setSortDirection(direction)
  }


  const getStatusBadge = (status, client) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'פעיל', icon: CheckCircle },
      trial: { color: 'bg-blue-100 text-blue-800', label: 'ניסיון', icon: Zap },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'לא פעיל', icon: X },
      // Legacy status mapping for backward compatibility
      expired: { color: 'bg-gray-100 text-gray-800', label: 'לא פעיל', icon: X },
      suspended: { color: 'bg-gray-100 text-gray-800', label: 'לא פעיל', icon: X },
      pending: { color: 'bg-gray-100 text-gray-800', label: 'לא פעיل', icon: X }
    }

    const config = statusConfig[status] || statusConfig.inactive
    const Icon = config.icon
    const daysRemainingText = getDaysRemainingText(client)
    const tooltipId = `status-tooltip-${client?.client_unique_id || Math.random()}`

    return (
      <div className="relative">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
          data-tooltip-id={daysRemainingText ? tooltipId : undefined}
        >
          <Icon className="w-3 h-3 ml-1" />
          {config.label}
        </span>
        {daysRemainingText && (
          <Tooltip
            id={tooltipId}
            place="top"
            content={daysRemainingText}
            className="!bg-gray-900 !text-white !text-xs !px-2 !py-1 !rounded-lg !shadow-lg"
          />
        )}
      </div>
    )
  }

  const getSyncStatusBadge = (status) => {
    const statusConfig = {
      recent: { color: 'bg-green-100 text-green-800', label: 'עדכני' },
      normal: { color: 'bg-blue-100 text-blue-800', label: 'רגיל' },
      stale: { color: 'bg-yellow-100 text-yellow-800', label: 'מיושן' },
      never: { color: 'bg-gray-100 text-gray-800', label: 'לא סונכרן' }
    }
    
    const config = statusConfig[status] || statusConfig.never
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין'
    return new Date(dateString).toLocaleDateString('he-IL')
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'לא זמין'
    return new Date(dateString).toLocaleString('he-IL')
  }

  const calculateDaysRemaining = (client) => {
    const now = new Date()
    let expiryDate = null

    if (client.plan_status === 'trial' && client.trial_expiry_date) {
      expiryDate = new Date(client.trial_expiry_date)
    } else if (client.plan_status === 'active' && client.plan_expiry_date) {
      expiryDate = new Date(client.plan_expiry_date)
    }

    if (!expiryDate) return null

    const timeDiff = expiryDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

    return daysDiff
  }

  const getDaysRemainingText = (client) => {
    const daysRemaining = calculateDaysRemaining(client)

    if (daysRemaining === null) return null

    if (daysRemaining > 0) {
      return `נותרו ${daysRemaining} ימים`
    } else if (daysRemaining === 0) {
      return 'פג היום'
    } else {
      return `פג לפני ${Math.abs(daysRemaining)} ימים`
    }
  }

  // Define table columns
  const tableColumns = [
    {
      id: 'client_unique_id',
      key: 'client_unique_id',
      label: 'מספר לקוח',
      type: 'text',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          #{row.client_unique_id}
        </span>
      )
    },
    {
      id: 'client_info',
      key: 'full_name',
      label: 'שם מלא ',
      type: 'text',
      sortable: true,
      sortKey: 'full_name',
      render: (row) => (
        <div className="flex items-center   space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {row.first_name?.charAt(0)?.toUpperCase() || 'L'}{row.last_name?.charAt(0)?.toUpperCase() || ''}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.full_name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
            <div className="text-xs text-gray-400">{row.phone}</div>
          </div>
        </div>
      )
    },
    {
      id: 'email',
      key: 'email',
      label: 'אימייל',
      type: 'text',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.email || 'לא זמין'}
        </div>
      )
    },
    {
      id: 'plan_info',
      key: 'plan_name',
      label: 'תוכנית',
      type: 'text',
      sortable: true,
      sortKey: 'plan_name',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.plan_name || 'ללא תוכנית'}</div>
          {row.plan_price && (
            <div className="text-sm text-gray-500">₪{row.plan_price}</div>
          )}
          {row.level_name && (
            <div className="text-xs flex items-center mt-1">
              <Crown className="w-3 h-3 ml-1 text-yellow-500" />
              <span className="text-yellow-600">
                {row.level_name}
              </span>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'plan_status',
      key: 'plan_status',
      label: 'סטטוס מנוי',
      type: 'custom',
      sortable: true,
      render: (row) => getStatusBadge(row.plan_status, row)
    },
    
  
    {
      id: 'device_info',
      key: 'model',
      label: 'מכשיר',
      type: 'text',
      sortable: true,
      sortKey: 'model',
      render: (row) => (
        <div className="flex items-center   space-x-2">
          <Smartphone className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium">{row.model || 'לא זמין'}</div>
            <div className="text-xs text-gray-500">{row.android_version}</div>
          </div>
        </div>
      )
    },
    {
      id: 'sync_status',
      key: 'sync_status',
      label: 'סטטוס סינכרון',
      type: 'custom',
      sortable: true,
      render: (row) => (
        <div>
          {getSyncStatusBadge(row.sync_status)}
          <div className="text-xs text-gray-500 mt-1">
            {formatDateTime(row.last_sync)}
          </div>
        </div>
      )
    },
    {
      id: 'registration_date',
      key: 'registration_date',
      label: 'תאריך הרשמה',
      type: 'date',
      sortable: true,
      render: (row) => formatDate(row.registration_date)
    },
    {
      id: 'actions',
      key: 'actions',
      label: 'פעולות',
      type: 'custom',
      render: (row) => (
        <div className="flex items-center   space-x-2">
          <select
            onChange={(e) => e.target.value && handleStatusUpdate(row.client_unique_id, e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            defaultValue=""
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">שנה סטטוס</option>
            <option value="active">פעיל</option>
            <option value="trial">ניסיון</option>
            <option value="inactive">לא פעיל</option>
          </select>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(row)
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="מחק לקוח"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
        </div>
      )
    }
  ]

  const tableConfig = {
    columns: tableColumns,
    data: clients,
    onRowClick: handleClientClick,
    tableType: 'clients'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex items-center   space-x-2">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">טוען לקוחות...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center   space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ניהול לקוחות</h1>
              <p className="text-gray-600">טבלת לקוחות עם אפשרויות מתקדמות</p>
            </div>
          </div>
          
          <button className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center   space-x-2">
            <Plus className="w-4 h-4" />
            <span>לקוח חדש</span>
          </button>
        </div>


     {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center ml-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">סך הכל לקוחות</p>
                <p className="text-2xl font-bold text-gray-900">{filterCounts.all}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center ml-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">לקוחות פעילים</p>
                <p className="text-2xl font-bold text-gray-900">{filterCounts.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center ml-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">בניסיון</p>
                <p className="text-2xl font-bold text-gray-900">{filterCounts.trial}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center ml-4">
                <X className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">לא פעילים</p>
                <p className="text-2xl font-bold text-gray-900">{filterCounts.inactive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-6">
            {/* Toggle Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">סינון לקוחות</label>
              <Toggle
                options={[
                  { 
                    id: 'all', 
                    label: 'כל הלקוחות', 
                    count: filterCounts.all,
                    icon: <Users className="w-4 h-4" />
                  },
                  { 
                    id: 'active', 
                    label: 'פעילים', 
                    count: filterCounts.active,
                    icon: <CheckCircle className="w-4 h-4" />
                  },
                  { 
                    id: 'trial', 
                    label: 'ניסיון', 
                    count: filterCounts.trial,
                    icon: <Zap className="w-4 h-4" />
                  },
                  { 
                    id: 'inactive', 
                    label: 'לא פעילים', 
                    count: filterCounts.inactive,
                    icon: <X className="w-4 h-4" />
  }
                ]}
                value={statusFilter}
                onChange={handleFilterChange}
                toggleStyle="tabs"
                className="w-full"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">חיפוש</label>
              <DebouncedSearch
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="חפש לפי שם, אימייל, טלפון או IMEI..."
                delay={300}
                className="w-full"
              />
            </div>
          </div>
        </div>

   
      </div>


      {/* Table */}
      <Table
        tableConfig={tableConfig}
        onLoadMore={loadMoreClients}
        hasMore={hasMore}
        loading={loadingMore || searchLoading || filterLoading}
        stickyHeader={true}
        onSelectionChange={setSelectedClients}
        onSortChange={handleSortChange}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />

      {/* Selection Actions */}
      {selectedClients.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4">
          <div className="flex items-center   space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedClients.length} לקוחות נבחרו
            </span>
            <div className="flex   space-x-2">
              <button className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                עדכון מרוכז
              </button>
              <button className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                הפעל הכל
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        title="מחיקת לקוח"
      >
        <ConfirmModal
          message={
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                האם אתה בטוח שברצונך למחוק את הלקוח?
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-gray-900">{deleteModal.client?.full_name}</p>
                <p className="text-sm text-gray-600">{deleteModal.client?.email}</p>
                <p className="text-xs text-gray-500 font-mono">#{deleteModal.client?.client_unique_id}</p>
              </div>
              <p className="text-sm text-red-600">
                פעולה זו לא ניתנת לביטול ותמחק את כל הנתונים הקשורים ללקוח
              </p>
            </div>
          }
          variant="danger"
          confirmText="מחק לקוח"
          cancelText="ביטול"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </Modal>

    </div>
  )
}

export default ClientsTable