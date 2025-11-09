import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { CheckCircle, AlertCircle, Download, File as FileIcon, X } from 'lucide-react'
import apiClient from '../utils/api'
import FileUpload from './FileUpload'

const MagiskModules = () => {
  const [uploadedModules, setUploadedModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [customUploadPath, setCustomUploadPath] = useState('')

  useEffect(() => {
    loadUploadedModules()
  }, [])

  const handleFileSelect = (fileData) => {
    // File is already validated and converted to base64 by FileUpload component
    console.log('File selected:', fileData)
  }

  const handleUpload = async (fileData) => {
    try {
      // Prepare upload data
      const uploadData = {
        file_name: fileData.name,
        file_size: fileData.size,
        file_type: fileData.type,
        file_data: fileData.base64
      }

      // Add custom upload path if specified
      if (customUploadPath.trim()) {
        uploadData.upload_path = customUploadPath.trim()
      }

      // Send base64 data instead of FormData
      const response = await apiClient.apiRequest('upload/magisk-module', {
        method: 'POST',
        body: uploadData
      })

      if (response.success) {
        toast.success('מודול Magisk הועלה בהצלחה!')
        loadUploadedModules() // Refresh the list
        return response
      } else {
        toast.error(response.message || 'שגיאה בהעלאת הקובץ')
        throw new Error(response.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('שגיאה בהעלאת הקובץ')
      throw error
    }
  }

  const loadUploadedModules = async () => {
    try {
      setLoading(true)
      const response = await apiClient.apiRequest('uploads/magisk-modules')
      if (response.success) {
        setUploadedModules(response.modules || [])
      }
    } catch (error) {
      console.error('Error loading modules:', error)
      toast.error('שגיאה בטעינת המודולים')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">מודולי Magisk</h1>
          <p className="text-gray-600">העלה והנהל מודולי Magisk (קבצי ZIP) עבור המערכת</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">העלאת מודול חדש</h2>
            <p className="text-gray-600">העלה קובץ ZIP של מודול Magisk</p>
          </div>

          {/* Custom Upload Path */}
          <div className="mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                נתיב העלאה מותאם אישית (אופציונלי)
              </label>
              <input
                type="text"
                value={customUploadPath}
                onChange={(e) => setCustomUploadPath(e.target.value)}
                placeholder="magisk-modules-custom/"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-blue-700 mt-2">
                השאר ריק לשימוש בנתיב ברירת מחדל: <code className="bg-blue-100 px-1 rounded">uploads/magisk-modules/</code>
                <br />
                <strong>דוגמאות:</strong>
                <br />
                • <code className="bg-blue-100 px-1 rounded">custom/modules/</code> - לשמירה בספרייה מותאמת אישית
                <br />
                • <code className="bg-blue-100 px-1 rounded">magisk-custom/</code> - בספריית uploads
                <br />
                • <code className="bg-blue-100 px-1 rounded">modules/special/</code> - תת-ספרייה מותאמת
              </p>
            </div>
          </div>

          <FileUpload
            acceptedTypes={['.zip', 'application/zip', 'application/x-zip-compressed']}
            maxSize={50 * 1024 * 1024} // 50MB
            multiple={false}
            onFileSelect={handleFileSelect}
            onUpload={handleUpload}
            uploadButtonText="העלה מודול Magisk"
            dragText="גרור קובץ ZIP לכאן"
            clickText="או לחץ לבחירת קובץ ZIP"
          />
        </div>

        {/* Upload Guidelines */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">הנחיות העלאה</h3>
              <ul className="text-amber-700 space-y-1 text-sm">
                <li>• רק קבצי ZIP מאושרים של מודולי Magisk</li>
                <li>• גודל קובץ מקסימלי: 50MB</li>
                <li>• ודא שהמודול תואם לגרסת Magisk הנוכחית</li>
                <li>• המודול יעבור בדיקת אבטחה לפני האישור</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Uploaded Modules List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">מודולים שהועלו</h2>
            <span className="text-sm text-gray-500">{uploadedModules.length} מודולים</span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">טוען מודולים...</p>
            </div>
          ) : uploadedModules.length > 0 ? (
            <div className="space-y-4">
              {uploadedModules.map((module) => {
                const getStatusColor = (status) => {
                  switch (status) {
                    case 'approved': return 'text-green-600'
                    case 'pending': return 'text-yellow-600'
                    case 'rejected': return 'text-red-600'
                    default: return 'text-gray-600'
                  }
                }

                const getStatusIcon = (status) => {
                  switch (status) {
                    case 'approved': return <CheckCircle className="w-4 h-4 ml-1" />
                    case 'pending': return <AlertCircle className="w-4 h-4 ml-1" />
                    case 'rejected': return <X className="w-4 h-4 ml-1" />
                    default: return <FileIcon className="w-4 h-4 ml-1" />
                  }
                }

                const getStatusText = (status) => {
                  switch (status) {
                    case 'approved': return 'אושר'
                    case 'pending': return 'ממתין לאישור'
                    case 'rejected': return 'נדחה'
                    default: return 'לא ידוע'
                  }
                }

                return (
                  <div key={module.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{module.name}</p>
                        <p className="text-sm text-gray-500">{module.size} • הועלה {module.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`flex items-center text-sm ${getStatusColor(module.status)}`}>
                        {getStatusIcon(module.status)}
                        {getStatusText(module.status)}
                      </span>
                      {module.status === 'approved' && (
                        <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-gray-500">אין מודולים שהועלו עדיין</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MagiskModules