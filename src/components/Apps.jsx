import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import apiClient from '../utils/api'
import { Building2, Sparkles, DollarSign, Wrench, BookOpen, Heart, Music, Camera, Map, Smartphone, CheckCircle, FolderOpen } from 'lucide-react'

const Apps = () => {
  const [apps, setApps] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // For now, we'll create mock data based on your database structure
      // Later you can create PHP endpoints to fetch this data
      const mockCategories = [
        { category_id: 1, category_name: 'בנקים', category_icon: 'Building2' },
        { category_id: 2, category_name: 'יהדות', category_icon: 'Sparkles' },
        { category_id: 3, category_name: 'פיננסי', category_icon: 'DollarSign' },
        { category_id: 5, category_name: 'כלים ועזרים', category_icon: 'Wrench' },
        { category_id: 6, category_name: 'חינוכי', category_icon: 'BookOpen' },
        { category_id: 7, category_name: 'בריאות', category_icon: 'Heart' },
        { category_id: 8, category_name: 'מוזיקה', category_icon: 'Music' },
        { category_id: 9, category_name: 'צילום', category_icon: 'Camera' },
        { category_id: 10, category_name: 'ניווט ונסיעות', category_icon: 'Map' }
      ]

      const mockApps = [
        {
          app_id: 1,
          app_name: 'WhatsApp',
          package_name: 'com.whatsapp',
          category_id: 5,
          version_name: '2.24.1.75',
          rating: 4.5,
          download_count: '5B+',
          is_active: true
        },
        {
          app_id: 2,
          app_name: 'Instagram',
          package_name: 'com.instagram.android',
          category_id: 9,
          version_name: '314.0.0.38.120',
          rating: 4.2,
          download_count: '2B+',
          is_active: true
        },
        {
          app_id: 3,
          app_name: 'Bank Hapoalim',
          package_name: 'com.bankhapoalim.android',
          category_id: 1,
          version_name: '6.28.1',
          rating: 4.1,
          download_count: '1M+',
          is_active: true
        },
        {
          app_id: 4,
          app_name: 'Siddur',
          package_name: 'com.siddur.android',
          category_id: 2,
          version_name: '3.2.1',
          rating: 4.8,
          download_count: '500K+',
          is_active: true
        }
      ]

      setCategories(mockCategories)
      setApps(mockApps)
    } catch (err) {
      toast.error('שגיאה בטעינת האפליקציות')
      console.error('Error loading apps:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === 'all' || app.category_id === parseInt(selectedCategory)
    const matchesSearch = app.app_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.package_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.category_id === categoryId)
    return category ? category.category_name : 'לא ידוע'
  }

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.category_id === categoryId)
    const iconName = category ? category.category_icon : 'Smartphone'
    const iconMap = {
      Building2, Sparkles, DollarSign, Wrench, BookOpen, Heart, Music, Camera, Map, Smartphone
    }
    const IconComponent = iconMap[iconName] || Smartphone
    return <IconComponent className="w-6 h-6" />
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex items-center space-x-reverse space-x-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">טוען אפליקציות...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center  space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ניהול אפליקציות</h1>
            <p className="text-gray-600">צפייה וניהול אפליקציות במערכת</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">חיפוש אפליקציה</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="חפש לפי שם או Package Name..."
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סינון לפי קטגוריה</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">כל הקטגוריות</option>
              {categories.map(category => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center ml-4">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">סך האפליקציות</p>
              <p className="text-2xl font-bold text-gray-900">{apps.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center ml-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">אפליקציות פעילות</p>
              <p className="text-2xl font-bold text-gray-900">{apps.filter(app => app.is_active).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center ml-4">
              <FolderOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">קטגוריות</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Apps Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredApps.map(app => (
          <div key={app.app_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              {/* App Header */}
              <div className="flex items-center  space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  {getCategoryIcon(app.category_id)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">{app.app_name}</h3>
                  <p className="text-sm text-gray-500 truncate">{app.package_name}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${app.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>

              {/* App Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">קטגוריה:</span>
                  <span className="font-medium text-gray-900">{getCategoryName(app.category_id)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">גרסה:</span>
                  <span className="font-medium text-gray-900">{app.version_name}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">הורדות:</span>
                  <span className="font-medium text-gray-900">{app.download_count}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">דירוג:</span>
                  <div className="flex items-center space-x-reverse space-x-1">
                    <span className="font-medium text-gray-900">{app.rating}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(app.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-xl transition-colors duration-200">
                  צפה בפרטים
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">לא נמצאו אפליקציות</h3>
          <p className="text-gray-600">נסה לשנות את הפילטר או תנאי החיפוש</p>
        </div>
      )}
    </div>
  )
}

export default Apps