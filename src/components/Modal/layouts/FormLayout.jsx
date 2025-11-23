import { useState, forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import JoditEditor from 'jodit-react'
import { useGlobalState, useSystemUsers } from '../../../contexts/GlobalStateContext'
import MentionInput from '../../MentionInput'
import MentionMenu from '../../MentionMenu'
import '../../jodit.css'

export const FormLayout = forwardRef(({ data }, ref) => {
  const { t } = useTranslation()
  const { closeModal } = useGlobalState()
  const { users: systemUsers, loaded: usersLoaded, fetchUsers } = useSystemUsers()
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

  // Mention state for richtext fields with mentions
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, right: 0 })
  const mentionStartPos = useRef(null)
  const joditInstanceRef = useRef(null)
  const mentionMenuRef = useRef(null)
  const mentionOpenRef = useRef(mentionOpen)
  const mentionFilterRef = useRef(mentionFilter)

  // Keep refs in sync with state
  useEffect(() => {
    mentionOpenRef.current = mentionOpen
  }, [mentionOpen])

  useEffect(() => {
    mentionFilterRef.current = mentionFilter
  }, [mentionFilter])

  // Fetch system users for mentions
  useEffect(() => {
    if (!usersLoaded) {
      fetchUsers()
    }
  }, [usersLoaded, fetchUsers])

  // Track which richtext field has mentions enabled (for handleChange)
  const mentionFieldRef = useRef(null)

  // Handle mention selection - insert into Jodit editor
  const handleMentionSelect = (user) => {
    const editor = joditInstanceRef.current
    if (!editor) {
      console.error('No editor instance')
      return
    }

    // Capture current filter text before state update
    const currentFilter = mentionFilter
    const mentionHtml = `<span class="mention" data-user-id="${user.id}" contenteditable="false" style="background-color: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: 500;">@${user.full_name || user.username}</span>&nbsp;`

    // Close menu first
    setMentionOpen(false)
    setMentionFilter('')
    mentionStartPos.current = null

    // Use setTimeout to ensure the menu closes before we manipulate the editor
    setTimeout(() => {
      try {
        // Get current content
        let content = editor.value || ''

        // Find the last occurrence of @filter and replace it
        const searchText = '@' + currentFilter
        const lastIndex = content.lastIndexOf(searchText)

        if (lastIndex !== -1) {
          // Replace the @filter text with the mention HTML
          content = content.substring(0, lastIndex) + mentionHtml + content.substring(lastIndex + searchText.length)
        } else {
          // Fallback: just append
          content = content + mentionHtml
        }

        // Set the value
        if (typeof editor.setEditorValue === 'function') {
          editor.setEditorValue(content)
        } else {
          editor.value = content
        }

        // Focus and update React state
        editor.focus()
        if (mentionFieldRef.current) {
          handleChange(mentionFieldRef.current, content)
        }
      } catch (err) {
        console.error('Error inserting mention:', err)
      }
    }, 10)
  }

  const closeMentionMenu = () => {
    setMentionOpen(false)
    setMentionFilter('')
    mentionStartPos.current = null
  }

  // Memoized Jodit config with mention support - only depends on t to prevent re-init
  const joditConfigWithMentions = useMemo(() => ({
    direction: 'rtl',
    language: 'he',
    toolbarAdaptive: false,
    toolbarSticky: false,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    minHeight: 150,
    maxHeight: 300,
    enter: 'DIV',
    placeholder: '',
    buttons: [
      'bold', 'italic', 'underline', '|',
      'ul', 'ol', '|',
      'link', 'image', 'video', '|',
      'eraser'
    ],
    buttonsMD: [
      'bold', 'italic', '|',
      'ul', 'ol', '|',
      'link', 'image'
    ],
    buttonsSM: [
      'bold', 'italic', '|',
      'ul', 'ol', '|',
      'image'
    ],
    buttonsXS: [
      'bold', 'italic', 'ul', 'image'
    ],
    uploader: {
      insertImageAsBase64URI: true
    },
    image: {
      openOnDblClick: true,
      editSrc: true,
      useImageEditor: true
    },
    style: {
      font: '14px Arial, sans-serif'
    },
    events: {
      afterInit: (editor) => {
        joditInstanceRef.current = editor
      },
      keyup: () => {
        const editor = joditInstanceRef.current
        if (!editor) return

        // Get text before cursor to detect @mention
        const sel = editor.editorWindow.getSelection()
        if (!sel || sel.rangeCount === 0) return

        const range = sel.getRangeAt(0)
        const textNode = range.startContainer

        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent.substring(0, range.startOffset)
          const lastAtIndex = text.lastIndexOf('@')

          if (lastAtIndex !== -1) {
            const afterAt = text.substring(lastAtIndex + 1)
            // Check if there's no space after @ (still typing mention)
            if (!/\s/.test(afterAt)) {
              // Open mention menu
              if (!mentionStartPos.current) {
                mentionStartPos.current = lastAtIndex
              }
              setMentionFilter(afterAt)
              setMentionOpen(true)

              // Calculate position for menu (RTL - use right positioning)
              const editorRect = editor.container.getBoundingClientRect()
              const selection = editor.editorWindow.getSelection()
              if (selection.rangeCount > 0) {
                const rangeRect = selection.getRangeAt(0).getBoundingClientRect()
                setMentionPosition({
                  top: rangeRect.bottom - editorRect.top + 5,
                  right: editorRect.right - rangeRect.right
                })
              }
              return
            }
          }
        }

        // Close menu if no valid mention context
        if (mentionOpenRef.current) {
          closeMentionMenu()
        }
      },
      keydown: (e) => {
        // Handle keyboard navigation for mention menu
        if (mentionOpenRef.current && mentionMenuRef.current) {
          const handled = mentionMenuRef.current.handleKeyDown(e)
          if (handled) {
            e.preventDefault()
            return
          }
        }

        // Handle Escape to close mention menu
        if (e.key === 'Escape' && mentionOpenRef.current) {
          e.preventDefault()
          closeMentionMenu()
        }
      }
    }
  }), [t]) // Only depend on t, not on mention state

  // Basic Jodit config without mentions
  const joditConfigBasic = useMemo(() => ({
    direction: 'rtl',
    language: 'he',
    toolbarAdaptive: false,
    toolbarSticky: false,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    minHeight: 150,
    maxHeight: 300,
    enter: 'DIV',
    placeholder: '',
    buttons: [
      'bold', 'italic', 'underline', '|',
      'ul', 'ol', '|',
      'link', 'image', 'video', '|',
      'eraser'
    ],
    buttonsMD: [
      'bold', 'italic', '|',
      'ul', 'ol', '|',
      'link', 'image'
    ],
    buttonsSM: [
      'bold', 'italic', '|',
      'ul', 'ol', '|',
      'image'
    ],
    buttonsXS: [
      'bold', 'italic', 'ul', 'image'
    ],
    uploader: {
      insertImageAsBase64URI: true
    },
    image: {
      openOnDblClick: true,
      editSrc: true,
      useImageEditor: true
    },
    style: {
      font: '14px Arial, sans-serif'
    }
  }), [])

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
        return field.mentions ? (
          <MentionInput
            multiline
            rows={field.rows || 3}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={submitting}
            className={`resize-none ${errors[field.name] ? 'border-red-300' : ''}`}
          />
        ) : (
          <textarea
            {...commonProps}
            rows={field.rows || 3}
            className={`${commonProps.className} resize-none`}
          />
        )

      case 'richtext':
        // Store the field name for mention handling
        if (field.mentions) {
          mentionFieldRef.current = field.name
        }
        return (
          <div className="jodit-form-editor relative">
            <JoditEditor
              value={formData[field.name] || ''}
              config={field.mentions ? joditConfigWithMentions : joditConfigBasic}
              onBlur={(content) => handleChange(field.name, content)}
            />
            {field.mentions && (
              <MentionMenu
                ref={mentionMenuRef}
                items={systemUsers}
                isOpen={mentionOpen}
                position={mentionPosition}
                filterText={mentionFilter}
                onSelect={handleMentionSelect}
                onClose={closeMentionMenu}
                emptyMessage={t('common.noUsersFound')}
              />
            )}
          </div>
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
        return field.mentions ? (
          <MentionInput
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={submitting}
            className={errors[field.name] ? 'border-red-300' : ''}
          />
        ) : (
          <input type="text" {...commonProps} />
        )
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
