import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { toast } from 'react-toastify'
import apiClient from '../utils/api'

const GlobalStateContext = createContext()

// Action types
export const ACTIONS = {
  // Modal actions
  OPEN_MODAL: 'OPEN_MODAL',
  CLOSE_MODAL: 'CLOSE_MODAL',
  CLOSE_ALL_MODALS: 'CLOSE_ALL_MODALS',

  // User actions
  SET_USER: 'SET_USER',
  LOGOUT_USER: 'LOGOUT_USER',
  UPDATE_USER: 'UPDATE_USER',
  SET_USER_LOADING: 'SET_USER_LOADING',

  // Other actions
  SET_THEME: 'SET_THEME',
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_LOADING: 'SET_LOADING',
}

// Initial state
const initialState = {
  // Modal state
  modalStack: [],

  // User authentication state
  user: null,
  isLoggedIn: false,
  userLoading: true,

  // App state
  theme: 'light',
  language: 'he',
  isLoading: false,
}

// Reducer function
const globalReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.OPEN_MODAL: {
      const modalId = Date.now() + Math.random()
      const newModal = {
        id: modalId,
        layout: action.payload.layout || 'default',
        title: action.payload.title || '',
        content: action.payload.content || null,
        data: action.payload.data || {},
        size: action.payload.size || 'lg',
        onConfirm: action.payload.onConfirm,
        onClose: action.payload.onClose,
        onCancel: action.payload.onCancel,
        onDataReceived: action.payload.onDataReceived,
        showConfirmButton: action.payload.showConfirmButton !== false,
        showCancelButton: action.payload.showCancelButton !== false,
        confirmText: action.payload.confirmText || 'אישור',
        cancelText: action.payload.cancelText || 'ביטול',
        variant: action.payload.variant || 'info',
        closeOnBackdropClick: action.payload.closeOnBackdropClick !== false,
        closeOnEscape: action.payload.closeOnEscape !== false,
      }
      return {
        ...state,
        modalStack: [...state.modalStack, newModal]
      }
    }

    case ACTIONS.CLOSE_MODAL: {
      const newStack = [...state.modalStack]
      newStack.pop() // Remove the last (top) modal
      return {
        ...state,
        modalStack: newStack
      }
    }

    case ACTIONS.CLOSE_ALL_MODALS:
      return {
        ...state,
        modalStack: []
      }

    case ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        isLoggedIn: true,
        userLoading: false
      }

    case ACTIONS.LOGOUT_USER:
      return {
        ...state,
        user: null,
        isLoggedIn: false,
        userLoading: false
      }

    case ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }

    case ACTIONS.SET_USER_LOADING:
      return {
        ...state,
        userLoading: action.payload
      }

    case ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload
      }

    case ACTIONS.SET_LANGUAGE:
      return {
        ...state,
        language: action.payload
      }

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      }

    default:
      return state
  }
}

// Provider component
export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState)

  // Check for existing user session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = apiClient.getToken()
      const userData = localStorage.getItem('userData')

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          dispatch({
            type: ACTIONS.SET_USER,
            payload: { user: parsedUser }
          })
        } catch (error) {
          console.error('Error parsing stored user data:', error)
          localStorage.removeItem('userData')
          dispatch({ type: ACTIONS.SET_USER_LOADING, payload: false })
        }
      } else {
        dispatch({ type: ACTIONS.SET_USER_LOADING, payload: false })
      }
    }

    checkSession()
  }, [])

  // Modal helper functions
  const openModal = useCallback((config) => {
    dispatch({ type: ACTIONS.OPEN_MODAL, payload: config })
  }, [])

  const closeModal = useCallback(() => {
    dispatch({ type: ACTIONS.CLOSE_MODAL })
  }, [])

  const closeAllModals = useCallback(() => {
    dispatch({ type: ACTIONS.CLOSE_ALL_MODALS })
  }, [])

  const openConfirmModal = useCallback(({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'אישור',
    cancelText = 'ביטול',
    variant = 'danger'
  }) => {
    openModal({
      layout: 'confirmAction',
      title,
      size: 'sm',
      data: {
        message,
        variant
      },
      confirmText,
      cancelText,
      showConfirmButton: true,
      showCancelButton: true,
      closeOnBackdropClick: true,
      closeOnEscape: true,
      onConfirm: () => {
        onConfirm?.()
        closeModal()
      }
    })
  }, [openModal, closeModal])

  const setTheme = useCallback((theme) => {
    dispatch({ type: ACTIONS.SET_THEME, payload: theme })
  }, [])

  const setLanguage = useCallback((language) => {
    dispatch({ type: ACTIONS.SET_LANGUAGE, payload: language })
  }, [])

  const setLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: loading })
  }, [])

  // User helper functions
  const login = useCallback((userData, token) => {
    dispatch({
      type: ACTIONS.SET_USER,
      payload: { user: userData }
    })
    localStorage.setItem('userData', JSON.stringify(userData))
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient.logout()
      toast.success('התנתקת בהצלחה!')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('שגיאה בהתנתקות')
    } finally {
      dispatch({ type: ACTIONS.LOGOUT_USER })
      localStorage.removeItem('userData')
    }
  }, [])

  const updateUser = useCallback((updates) => {
    dispatch({
      type: ACTIONS.UPDATE_USER,
      payload: updates
    })
    const updatedUser = { ...state.user, ...updates }
    localStorage.setItem('userData', JSON.stringify(updatedUser))
  }, [state.user])

  const value = {
    state,
    dispatch,
    ACTIONS,

    // Modal helper functions
    openModal,
    closeModal,
    closeAllModals,
    openConfirmModal,

    // User helper functions
    login,
    logout,
    updateUser,

    // Other helper functions
    setTheme,
    setLanguage,
    setLoading,

    // Computed user values for convenience
    isAdmin: state.user?.user_type === 'admin',
    userName: state.user ? `${state.user.first_name} ${state.user.last_name}` : '',
    userInitials: state.user ? `${state.user.first_name?.charAt(0) || ''}${state.user.last_name?.charAt(0) || ''}` : ''
  }

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  )
}

// Custom hook to use global state
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext)
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider')
  }
  return context
}

// Backwards compatibility hooks

// For modal operations
export const useModal = () => {
  const { state, openModal, closeModal, closeAllModals, openConfirmModal } = useGlobalState()
  return {
    modalStack: state.modalStack,
    openModal,
    closeModal,
    closeAllModals,
    openConfirmModal,
  }
}

// For user/authentication operations
export const useUser = () => {
  const {
    state,
    login,
    logout,
    updateUser,
    isAdmin,
    userName,
    userInitials
  } = useGlobalState()

  return {
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    loading: state.userLoading,
    login,
    logout,
    updateUser,
    isAdmin,
    userName,
    userInitials
  }
}
