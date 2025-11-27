import { useState, useEffect, useRef } from 'react'
import { Tooltip } from 'react-tooltip'
import { toast } from 'react-toastify'
import apiClient from '../utils/api'
import { 
  MessageCircle, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Send,
  UserCheck,
  X,
  Filter,
  Search,
  Archive
} from 'lucide-react'

const TicketsManager = () => {
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketUpdates, setTicketUpdates] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [ticketUpdates])

  useEffect(() => {
    if (selectedTicket) {
      loadTicketUpdates(selectedTicket.id)
      // Poll for updates every 30 seconds
      const interval = setInterval(() => {
        loadTicketUpdates(selectedTicket.id)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [selectedTicket])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // First try to get user data from localStorage as fallback
      const storedUserData = localStorage.getItem('TaskFlow_userData')
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData)
          console.log('Setting currentUser from localStorage:', userData)
          setCurrentUser(userData)
        } catch (e) {
          console.error('Error parsing stored user data:', e)
        }
      }
      
      const [ticketsResponse, usersResponse, currentUserResponse] = await Promise.all([
        apiClient.getTicketsWithDetails(),
        apiClient.getUsers(),
        apiClient.getCurrentUser()
      ])

      console.log('Tickets response:', ticketsResponse)
      console.log('Users response:', usersResponse)
      console.log('Current user response:', currentUserResponse)

      if (ticketsResponse.success) {
        setTickets(ticketsResponse.data)
      }

      if (usersResponse.success) {
        setUsers(usersResponse.data)
      }

      if (currentUserResponse.success) {
        console.log('Setting currentUser from API:', currentUserResponse.user)
        setCurrentUser(currentUserResponse.user)
      } else {
        console.log('Failed to get current user from API, keeping localStorage user')
      }
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTicketUpdates = async (ticketId) => {
    try {
      const response = await apiClient.getTicketUpdates(ticketId)
      if (response.success) {
        setTicketUpdates(response.data)
      }
    } catch (err) {
      console.error('Error loading ticket updates:', err)
    }
  }

  const handleSendMessage = async () => {
    console.log('Send button clicked!')
    console.log('newMessage:', newMessage)
    console.log('selectedTicket:', selectedTicket)
    console.log('currentUser:', currentUser)
    console.log('sending:', sending)
    
    if (!newMessage.trim() || !selectedTicket || !currentUser || sending) {
      console.log('Send blocked - conditions not met')
      return
    }

    try {
      console.log('Starting to send message...')
      setSending(true)
      
      console.log('Calling API with params:', {
        ticketId: selectedTicket.id,
        message: newMessage.trim(),
        userId: currentUser.id,
        userType: 'user'
      })
      
      const response = await apiClient.addTicketUpdate(
        selectedTicket.id,
        newMessage.trim(),
        currentUser.id,
        'user'
      )

      console.log('API response:', response)

      if (response.success) {
        console.log('Message sent successfully!')
        // Add the new message to the chat immediately
        setTicketUpdates(prev => [...prev, response.data])
        setNewMessage('')
        
        // Update ticket list to reflect new update count
        setTickets(prev => prev.map(ticket => 
          ticket.id === selectedTicket.id 
            ? { 
                ...ticket, 
                update_count: (parseInt(ticket.update_count) + 1).toString(),
                last_update: response.data.created_at
              }
            : ticket
        ))
      } else {
        console.log('API returned error:', response)
        throw new Error(response.message || 'Failed to send message')
      }
    } catch (err) {
      console.error('Error in handleSendMessage:', err)
      toast.error('שגיאה בשליחת ההודעה: ' + (err.message || 'אירעה שגיאה לא צפויה'))
    } finally {
      console.log('Send process finished')
      setSending(false)
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
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => ({ ...prev, status: 'closed', closed_at: new Date().toISOString() }))
        }
      }
    } catch (err) {
      toast.error('שגיאה בסגירת הפנייה')
      console.error('Error closing ticket:', err)
    }
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
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => ({ ...prev, assigned_to: userId, assigned_user_name: assignedUser?.username }))
        }
      }
    } catch (err) {
      toast.error('שגיאה בהקצאת הפנייה')
      console.error('Error assigning ticket:', err)
    }
  }

  const getFilteredTickets = () => {
    return tickets.filter(ticket => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
      const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }

  const getStatusColor = (status) => {
    return status === 'open' ? 'text-green-600' : 'text-gray-500'
  }

  const getStatusIcon = (status) => {
    return status === 'open' ? AlertCircle : CheckCircle
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const MessageBubble = ({ update }) => {
    const isFromAdmin = update.user_type === 'user'
    
    return (
      <div className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
          isFromAdmin 
            ? 'bg-blue-600 text-white ml-4' 
            : 'bg-gray-100 text-gray-900 mr-4'
        }`}>
          <div className="text-sm font-medium mb-1">
            {update.sender_name}
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {update.message}
          </div>
          <div className={`text-xs mt-2 ${
            isFromAdmin ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatDate(update.created_at)}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex items-center space-x-reverse space-x-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">טוען פניות...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center  space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ניהול פניות לקוחות</h1>
              <p className="text-gray-600">צפייה ומענה לפניות הלקוחות במערכת</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
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
            
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
              <div className="relative">
                <Filter className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                >
                  <option value="all">כל הפניות</option>
                  <option value="open">פתוחות</option>
                  <option value="closed">סגורות</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Tickets List */}
        <div className="w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              פניות ({getFilteredTickets().length})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {getFilteredTickets().map(ticket => {
              const StatusIcon = getStatusIcon(ticket.status)
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                    selectedTicket?.id === ticket.id 
                      ? 'bg-purple-50 border-r-4 border-r-purple-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-600">{ticket.client_name}</p>
                    </div>
                    <div className="flex items-center  space-x-1 mr-2">
                      <StatusIcon className={`w-4 h-4 ${getStatusColor(ticket.status)}`} />
                      {parseInt(ticket.update_count) > 0 && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          {ticket.update_count}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {ticket.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 ml-1" />
                      {formatDate(ticket.created_at)}
                    </div>
                    {ticket.assigned_user_name && (
                      <div className="flex items-center">
                        <User className="w-3 h-3 ml-1" />
                        {ticket.assigned_user_name}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat Interface */}
        {selectedTicket ? (
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            {/* Ticket Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {selectedTicket.subject}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>לקוח: {selectedTicket.client_name}</span>
                    <span>נפתח: {formatDate(selectedTicket.created_at)}</span>
                    {selectedTicket.assigned_user_name && (
                      <span>מוקצה ל: {selectedTicket.assigned_user_name}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedTicket.status === 'open' && (
                    <>
                      {/* Assign Dropdown */}
                      <select
                        onChange={(e) => e.target.value && handleAssignTicket(selectedTicket.id, parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        defaultValue=""
                      >
                        <option value="">הקצה לעובד</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                      
                      {/* Close Button */}
                      <button
                        onClick={() => handleCloseTicket(selectedTicket.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center"
                        data-tooltip-id="close-tooltip"
                        data-tooltip-content="סגור פנייה"
                      >
                        <CheckCircle className="w-4 h-4 ml-1" />
                        סגור
                      </button>
                    </>
                  )}
                  
                  {selectedTicket.status === 'closed' && (
                    <div className="flex items-center px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                      <Archive className="w-4 h-4 ml-1" />
                      פנייה סגורה
                    </div>
                  )}
                </div>
              </div>
              
              {/* Ticket Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {ticketUpdates.map(update => (
                <MessageBubble key={update.id} update={update} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedTicket.status === 'open' && (
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex items-end space-x-reverse space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder="כתוב תגובה... (לחץ Enter לשליחה, Shift+Enter לשורה חדשה)"
                        className={`w-full px-4 py-3 border rounded-xl resize-none transition-all duration-200 ${
                          sending 
                            ? 'border-purple-300 bg-purple-50' 
                            : 'border-gray-200 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                        }`}
                        rows={3}
                        disabled={sending}
                      />
                      {sending && (
                        <div className="absolute inset-0 bg-white bg-opacity-50 rounded-xl flex items-center justify-center">
                          <div className="text-sm text-purple-600 flex items-center">
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin ml-2" />
                            שולח הודעה...
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Character counter and help text */}
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-reverse space-x-4">
                        <span>תווים: {newMessage.length}</span>
                        <span>Enter = שלח, Shift+Enter = שורה חדשה</span>
                      </div>
                      {newMessage.trim() && (
                        <div className="text-green-600 flex items-center">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          מוכן לשליחה
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      console.log('Send button clicked (onClick)');
                      handleSendMessage();
                    }}
                    disabled={!newMessage.trim() || sending}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center min-w-[100px] justify-center ${
                      !newMessage.trim() || sending
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                    data-tooltip-id="send-tooltip"
                    data-tooltip-content={sending ? "שולח..." : "שלח הודעה (Enter)"}
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin ml-1" />
                        שולח...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-1" />
                        שלח
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">בחר פנייה לצפייה</h3>
              <p className="text-gray-600">בחר פנייה מהרשימה כדי לצפות בפרטים ולהשיב</p>
            </div>
          </div>
        )}
      </div>

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
      <Tooltip
        id="send-tooltip"
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

export default TicketsManager