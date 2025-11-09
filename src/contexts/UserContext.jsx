import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import apiClient from '../utils/api'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = apiClient.getToken()
    const userData = localStorage.getItem('userData')
    
    if (token && userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setIsLoggedIn(true)
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    setUser(userData)
    setIsLoggedIn(true)
    // Store user data in localStorage for persistence
    localStorage.setItem('userData', JSON.stringify(userData))
  }

  const logout = async () => {
    try {
      await apiClient.logout()
      toast.success('התנתקת בהצלחה!')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('שגיאה בהתנתקות')
    } finally {
      setUser(null)
      setIsLoggedIn(false)
      localStorage.removeItem('userData')
    }
  }

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)
    localStorage.setItem('userData', JSON.stringify(updatedUser))
  }

  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser()
      if (response.success && response.data) {
        setUser(response.data)
        localStorage.setItem('userData', JSON.stringify(response.data))
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }

  const value = {
    user,
    isLoggedIn,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
    // Computed values for easy access
    isAdmin: user?.user_type === 'admin',
    userName: user ? `${user.first_name} ${user.last_name}` : '',
    userInitials: user ? `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}` : ''
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}