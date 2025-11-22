import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const DeleteConfirmLayout = ({ data }) => {
  const { t } = useTranslation()
  const { itemName, message } = data

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-gray-700">
            {message || t('messages.confirmDelete')}
          </p>
          {itemName && (
            <p className="mt-2 font-medium text-gray-900">"{itemName}"</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmLayout
