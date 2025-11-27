import { useState, useEffect } from 'react'
import { Tooltip } from 'react-tooltip'
import { toast } from 'react-toastify'
import apiClient from '../utils/api'
import { Table } from './Table/Table'
import { TicketDialog } from './TicketDialog'
import { Toggle } from './Toggle'
import { 
  MessageCircle, 
  Search, 
  Filter, 
  Plus,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  X
} from 'lucide-react'

const TicketsTable = () => {
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('open')
  const [filterCounts, setFilterCounts] = useState({
    all: 0,
    open: 0,
    closed: 0,
    unassigned: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedTickets, setSelectedTickets] = useState([])
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const itemsPerPage = 25

  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload data when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFilteredData()
    }, 300) // Debounce search
    
    return () => clearTimeout(timeoutId)
  }, [statusFilter, searchTerm])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Get user data from localStorage as fallback
      const storedUserData = localStorage.getItem('TaskFlow_userData')
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData)
          setCurrentUser(userData)
        } catch (e) {
          console.error('Error parsing stored user data:', e)
        }
      }
      
      const [ticketsResponse, usersResponse, currentUserResponse] = await Promise.all([
        apiClient.getTicketsWithDetails(1, itemsPerPage),
        apiClient.getUsers(),
        apiClient.getCurrentUser()
      ])

      if (ticketsResponse.success) {
        const responseData = ticketsResponse.data?.data || ticketsResponse.data || []
        const pagination = ticketsResponse.data?.pagination
        
        setTickets(responseData)
        setHasMore(pagination?.has_more || false)
        updateFilterCounts()
      }

      if (usersResponse.success) {
        setUsers(usersResponse.data)
      }

      if (currentUserResponse.success && currentUserResponse.user) {
        setCurrentUser(currentUserResponse.user)
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
      setLoading(true)
      setCurrentPage(1)
      
      const filters = {
        status: statusFilter,
        search: searchTerm
      }
      
      const response = await apiClient.getTicketsWithDetails(1, itemsPerPage, filters)
      
      if (response.success) {
        const responseData = response.data?.data || response.data || []
        const pagination = response.data?.pagination
        
        setTickets(responseData)
        setHasMore(pagination?.has_more || false)
      }
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים')
      console.error('Error loading filtered data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreTickets = async () => {
    if (loadingMore || !hasMore) return
    
    try {
      setLoadingMore(true)
      const nextPage = currentPage + 1
      
      const filters = {
        status: statusFilter,
        search: searchTerm
      }
      
      const response = await apiClient.getTicketsWithDetails(nextPage, itemsPerPage, filters)
      
      if (response.success) {
        const responseData = response.data?.data || response.data || []
        const pagination = response.data?.pagination
        
        // Append new tickets to existing ones
        setTickets(prev => [...prev, ...responseData])
        setHasMore(pagination?.has_more || false)
        setCurrentPage(nextPage)
      }
    } catch (err) {
      console.error('Error loading more tickets:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket)
    setIsTicketDialogOpen(true)
  }

  const handleTicketDialogClose = () => {
    setIsTicketDialogOpen(false)
    setSelectedTicket(null)
  }

  const handleTicketUpdate = (ticketId, updateType, updateData) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        switch (updateType) {
          case 'message_added':
            return {
              ...ticket,
              update_count: (parseInt(ticket.update_count) + 1).toString(),
              last_update: updateData.created_at
            }
          case 'closed':
            return {
              ...ticket,
              status: 'closed',
              closed_at: new Date().toISOString()
            }
          case 'assigned':
            return {
              ...ticket,
              assigned_to: updateData.assigned_to,
              assigned_user_name: updateData.assigned_user_name
            }
          default:
            return ticket
        }
      }
      return ticket
    }))
  }

  const handleAssignTicket = async (ticketId, userId) => {
    try {
      const response = await apiClient.assignTicket(ticketId, userId)
      if (response.success) {
        const assignedUser = users.find(user => user.id === userId)
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, assigned_to: userId, assigned_user_name: assignedUser?.username }
            : ticket
        ))
      }
    } catch (err) {
      toast.error('שגיאה בהקצאת הפנייה')
      console.error('Error assigning ticket:', err)
    }
  }

  const handleCloseTicket = async (ticketId) => {
    try {
      const response = await apiClient.closeTicket(ticketId)
      if (response.success) {
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, status: 'closed', closed_at: new Date().toISOString() }
            : ticket
        ))
      }
    } catch (err) {
      toast.error('שגיאה בסגירת הפנייה')
      console.error('Error closing ticket:', err)
    }
  }

  const updateFilterCounts = async (ticketsData = null) => {
    try {
      // For accurate counts, fetch all tickets without pagination
      const response = await apiClient.getTicketsWithDetails(1, 1000)
      if (response.success) {
        const allTickets = response.data?.data || response.data || []
        const counts = {
          all: allTickets.length,
          open: allTickets.filter(t => t.status === 'open').length,
          closed: allTickets.filter(t => t.status === 'closed').length,
          unassigned: allTickets.filter(t => !t.assigned_user_name && t.status === 'open').length
        }
        setFilterCounts(counts)
      }
    } catch (err) {
      console.error('Error updating filter counts:', err)
      // Fallback to local data if available
      if (ticketsData) {
        const counts = {
          all: ticketsData.length,
          open: ticketsData.filter(t => t.status === 'open').length,
          closed: ticketsData.filter(t => t.status === 'closed').length,
          unassigned: ticketsData.filter(t => !t.assigned_user_name && t.status === 'open').length
        }
        setFilterCounts(counts)
      }
    }
  }

  const handleFilterChange = (filterId) => {
    setStatusFilter(filterId)
    setCurrentPage(1) // Reset pagination when filter changes
  }

  // Define table columns
  const tableColumns = [
    {
      id: 'id',
      key: 'id',
      label: 'מספר פנייה',
      type: 'text',
      render: (row) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          #{row.id}
        </span>
      )
    },
    {
      id: 'subject',
      key: 'subject',
      label: 'נושא',
      type: 'custom',
      render: (row) => {
        const getHebrewSubject = (subject) => {
          switch (subject) {
            case 'app_upload':
              return 'העלאת אפליקציה'
            case 'report':
              return 'דיווח'
            case 'other':
              return 'אחר'
            default:
              return subject // fallback to original value
          }
        }
        
        return (
          <div>
            <div className="font-medium text-gray-900">{getHebrewSubject(row.subject)}</div>
          </div>
        )
      }
    },
    {
      id: 'client_name',
      key: 'client_name',
      label: 'לקוח',
      type: 'text',
      render: (row) => (
        <div className="flex items-center   space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {row.client_name?.charAt(0)?.toUpperCase() || 'L'}
            </span>
          </div>
          <span className="font-medium">{row.client_name}</span>
        </div>
      )
    },
    {
      id: 'status',
      key: 'status',
      label: 'סטטוס',
      type: 'status'
    },
    {
      id: 'assigned_user_name',
      key: 'assigned_user_name',
      label: 'מוקצה ל',
      type: 'user'
    },
    {
      id: 'update_count',
      key: 'update_count',
      label: 'הודעות',
      type: 'text',
      render: (row) => (
        <div className="flex items-center justify-center">
          <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-medium">
            {row.update_count || 0}
          </span>
        </div>
      )
    },
    {
      id: 'created_at',
      key: 'created_at',
      label: 'נפתח',
      type: 'date'
    },
    {
      id: 'actions',
      key: 'actions',
      label: 'פעולות',
      type: 'custom',
      render: (row) => (
        <div className="flex items-center  space-x-2">
          {row.status === 'open' && (
            <>
              <select
                onChange={(e) => e.target.value && handleAssignTicket(row.id, parseInt(e.target.value))}
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                defaultValue=""
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">הקצה</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseTicket(row.id)
                }}
                className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
                data-tooltip-id="close-tooltip"
                data-tooltip-content="סגור פנייה"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ]

  const tableConfig = {
    columns: tableColumns,
    data: tickets, // Now using filtered data from backend
    onRowClick: handleTicketClick,
    tableType: 'tickets'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex items-center   space-x-2">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">טוען פניות...</span>
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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ניהול פניות לקוחות</h1>
              <p className="text-gray-600">טבלת פניות עם אפשרויות מתקדמות</p>
            </div>
          </div>
          
          <button className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center   space-x-2">
            <Plus className="w-4 h-4" />
            <span>פנייה חדשה</span>
          </button>
        </div>

      {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center ml-4">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">סך הכל פניות</p>
                <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center ml-4">
                <AlertCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">פניות פתוחות</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tickets.filter(t => t.status === 'open').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center ml-4">
                <CheckCircle className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">פניות סגורות</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tickets.filter(t => t.status === 'closed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center ml-4">
                <User className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">לא מוקצות</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tickets.filter(t => !t.assigned_user_name).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-6">
            {/* Toggle Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">סינון פניות</label>
              <Toggle
                options={[
                  { 
                    id: 'all', 
                    label: 'כל הפניות', 
                    count: filterCounts.all,
                    icon: <MessageCircle className="w-4 h-4" />
                  },
                  { 
                    id: 'open', 
                    label: 'פתוחות', 
                    count: filterCounts.open,
                    icon: <AlertCircle className="w-4 h-4" />
                  },
                  { 
                    id: 'unassigned', 
                    label: 'לא מוקצות', 
                    count: filterCounts.unassigned,
                    icon: <User className="w-4 h-4" />
                  },
                  { 
                    id: 'closed', 
                    label: 'סגורות', 
                    count: filterCounts.closed,
                    icon: <CheckCircle className="w-4 h-4" />
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
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="חפש לפי נושא, לקוח או תיאור..."
                />
              </div>
            </div>
          </div>
        </div>

  
      </div>


      {/* Table */}
      <Table
        tableConfig={tableConfig}
        onLoadMore={loadMoreTickets}
        hasMore={hasMore}
        loading={loadingMore}
        stickyHeader={true}
        onSelectionChange={setSelectedTickets}
      />

      {/* Selection Actions */}
      {selectedTickets.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4">
          <div className="flex items-center   space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedTickets.length} פניות נבחרו
            </span>
            <div className="flex   space-x-2">
              <button className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                הקצה בבת אחת
              </button>
              <button className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                סגור הכל
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Dialog */}
      <TicketDialog
        isOpen={isTicketDialogOpen}
        onClose={handleTicketDialogClose}
        ticket={selectedTicket}
        currentUser={currentUser}
        users={users}
        onTicketUpdate={handleTicketUpdate}
      />

      {/* Tooltips */}
      <Tooltip
        id="close-tooltip"
        style={{
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 10000
        }}
      />
    </div>
  )
}

export default TicketsTable