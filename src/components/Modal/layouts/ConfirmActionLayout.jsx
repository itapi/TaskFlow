import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const ConfirmActionLayout = ({ data }) => {
  const { t } = useTranslation()
  const { message, variant = 'info' } = data

  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    }
  }

  const config = variantConfig[variant] || variantConfig.info
  const IconComponent = config.icon

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-gray-700">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default ConfirmActionLayout
