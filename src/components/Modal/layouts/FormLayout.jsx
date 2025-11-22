import { useState, forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalState } from '../../../contexts/GlobalStateContext'

export const FormLayout = forwardRef(({ data }, ref) => {
  const { t } = useTranslation()
  const { closeModal } = useGlobalState()
  const { fields = [], onSubmit, initialValues = {} } = data

  const [formData, setFormData] = useState(() => {
    const initial = {}
    fields.forEach(field => {
      initial[field.name] = field.defaultValue ?? initialValues[field.name] ?? ''
    })
    return initial
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useImperativeHandle(ref, () => ({
    submitForm: handleSubmit
  }))

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = t('messages.requiredField')
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)
      if (onSubmit) {
        await onSubmit(formData)
      }
      closeModal()
    } catch (error) {
      console.error('Form submission error:', error)
      // Keep modal open on error
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value: formData[field.name] || '',
      onChange: (e) => handleChange(field.name, e.target.value),
      placeholder: field.placeholder,
      disabled: submitting,
      className: `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
        errors[field.name] ? 'border-red-300' : 'border-gray-200'
      }`
    }

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={field.rows || 3}
            className={`${commonProps.className} resize-none`}
          />
        )

      case 'select':
        return (
          <select {...commonProps}>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'date':
        return <input type="date" {...commonProps} />

      case 'number':
        return <input type="number" {...commonProps} />

      case 'email':
        return <input type="email" {...commonProps} />

      case 'password':
        return <input type="password" {...commonProps} />

      default:
        return <input type="text" {...commonProps} />
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        {fields.map(field => (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            {renderField(field)}
            {errors[field.name] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </form>
    </div>
  )
})

FormLayout.displayName = 'FormLayout'

export default FormLayout
