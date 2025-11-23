import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '../contexts/GlobalStateContext'
import { FolderKanban, CheckSquare, Users, Settings, LogOut } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'

const Sidebar = () => {
  const { user, logout } = useUser()
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()

  const menuItems = [
    {
      id: 'my-tasks',
      path: '/my-tasks',
      name: t('navigation.myTasks'),
      icon: CheckSquare
    },
    {
      id: 'projects',
      path: '/projects',
      name: t('navigation.projects'),
      icon: FolderKanban
    },
    {
      id: 'users',
      path: '/users',
      name: t('navigation.users'),
      icon: Users
    },
    {
      id: 'settings',
      path: '/settings',
      name: t('navigation.settings'),
      icon: Settings
    }
  ]

  const getUserInitials = () => {
    if (!user) return 'U'
    const name = user.full_name || user.username || 'User'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0]
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getRoleName = () => {
    if (!user) return t('users.roles.member')
    const roleMap = {
      'admin': t('users.roles.admin'),
      'manager': t('users.roles.manager'),
      'member': t('users.roles.member')
    }
    return roleMap[user.role] || t('users.roles.member')
  }

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out flex flex-col`}
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('app.name')}</h2>
                <p className="text-xs text-gray-500">{t('app.tagline')}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                isCollapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={isCollapsed ? item.name : ''}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${
                    isActive
                      ? 'text-indigo-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  {!isCollapsed && (
                    <span className="flex-1">{item.name}</span>
                  )}
                  {!isCollapsed && isActive && (
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className={`flex items-center space-x-3 p-3 rounded-lg bg-gray-50 ${
          isCollapsed ? 'justify-center' : ''
        }`}>
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">
              {getUserInitials()}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.full_name || user?.username || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getRoleName()}
              </p>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        {!isCollapsed && (
          <div className="px-1">
            <LanguageSwitcher />
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 group ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? t('auth.logout') : ''}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>{t('auth.logout')}</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
