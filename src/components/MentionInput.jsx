import { useRef, forwardRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSystemUsers } from '../contexts/GlobalStateContext'
import { useMention } from '../hooks/useMention'
import MentionMenu from './MentionMenu'

/**
 * MentionInput - A text input with @mention support
 *
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Change handler (receives event)
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.multiline - Use textarea instead of input
 * @param {number} props.rows - Number of rows for textarea
 * @param {Function} props.onKeyDown - Additional keydown handler
 * @param {Function} props.onMentionSelect - Callback when mention is selected
 */
const MentionInput = forwardRef(({
  value = '',
  onChange,
  placeholder,
  disabled = false,
  className = '',
  multiline = false,
  rows = 3,
  onKeyDown,
  onMentionSelect,
  ...rest
}, ref) => {
  const { t } = useTranslation()
  const { users: systemUsers, loaded: usersLoaded, fetchUsers } = useSystemUsers()
  const inputRef = useRef(null)

  // Fetch system users when component mounts (if not already loaded)
  useEffect(() => {
    if (!usersLoaded) {
      fetchUsers()
    }
  }, [usersLoaded, fetchUsers])

  const mention = useMention({
    trigger: '@',
    onMentionSelect: (user) => {
      onMentionSelect?.(user)
    }
  })

  const handleChange = (e) => {
    onChange?.(e)
    mention.handleInputChange(e)
  }

  const handleKeyDown = (e) => {
    // Let mention handle navigation first
    if (mention.handleKeyDown(e)) return
    onKeyDown?.(e)
  }

  const setRef = (el) => {
    inputRef.current = el
    mention.bindInput(el)
    if (ref) {
      if (typeof ref === 'function') ref(el)
      else ref.current = el
    }
  }

  const baseClassName = `w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${className}`

  const InputComponent = multiline ? 'textarea' : 'input'

  return (
    <div className="relative">
      <InputComponent
        ref={setRef}
        type={multiline ? undefined : 'text'}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={baseClassName}
        rows={multiline ? rows : undefined}
        {...rest}
      />
      <MentionMenu
        ref={mention.bindMenu}
        items={systemUsers}
        isOpen={mention.isMenuOpen}
        position={mention.menuPosition}
        filterText={mention.filterText}
        onSelect={mention.handleSelect}
        onClose={mention.closeMenu}
        emptyMessage={t('common.noUsersFound')}
      />
    </div>
  )
})

MentionInput.displayName = 'MentionInput'

export default MentionInput
