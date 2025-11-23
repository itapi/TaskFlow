import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Projects from './components/Projects'
import ProjectDetails from './components/ProjectDetails'
import MyTasks from './components/MyTasks'
import Users from './components/Users'
import Settings from './components/Settings'
import Sidebar from './components/Sidebar'
import GlobalModal from './components/GlobalModal'
import Loader from './components/Loader'
import { GlobalStateProvider, useUser, useSystemUsers } from './contexts/GlobalStateContext'
import './i18n/config'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

// Main App Component that uses GlobalStateContext
function AppContent() {
  const { user, isLoggedIn, loading, logout } = useUser()
  const { fetchUsers, loaded: usersLoaded } = useSystemUsers()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language, isRTL])

  // Fetch system users when logged in
  useEffect(() => {
    if (isLoggedIn && !usersLoaded) {
      fetchUsers()
    }
  }, [isLoggedIn, usersLoaded, fetchUsers])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader text={t('common.loading')} />
      </div>
    )
  }

  return (
    <>
      {!isLoggedIn ? (
        <Login />
      ) : (
        <Router basename="/taskflow">
          <div className="min-h-screen bg-gray-50 flex" dir={isRTL ? 'rtl' : 'ltr'}>
            <Sidebar />
            <main className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetails />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
          <GlobalModal />
        </Router>
      )}
      <ToastContainer
        position={isRTL ? "top-left" : "top-right"}
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={isRTL}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  )
}

// Root App component with GlobalStateProvider
function App() {
  return (
    <GlobalStateProvider>
      <AppContent />
    </GlobalStateProvider>
  )
}

export default App
