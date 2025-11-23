import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Reusable MentionMenu component
 * Shows a dropdown menu when triggered (e.g., when user types "@")
 * Can be used for @mentions, #tags, or any other trigger-based selection
 */
const MentionMenu = forwardRef(({
  items = [],
  isOpen = false,
  onSelect,
  onClose,
  position = { top: 0, left: 0 },
  filterText = '',
  renderItem,
  emptyMessage,
  maxHeight = 200,
  className = ''
}, ref) => {
  const { t } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef(null)
  const itemRefs = useRef([])

  // Filter items based on filterText
  const filteredItems = items.filter(item => {
    const searchText = filterText.toLowerCase()
    const name = (item.full_name || item.username || item.name || '').toLowerCase()
    const username = (item.username || '').toLowerCase()
    return name.includes(searchText) || username.includes(searchText)
  })

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filterText])

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleKeyDown: (e) => {
      if (!isOpen || filteredItems.length === 0) return false

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          )
          return true

        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          )
          return true

        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (filteredItems[selectedIndex]) {
            onSelect?.(filteredItems[selectedIndex])
          }
          return true

        case 'Escape':
          e.preventDefault()
          onClose?.()
          return true

        default:
          return false
      }
    },
    getSelectedItem: () => filteredItems[selectedIndex],
    reset: () => setSelectedIndex(0)
  }))

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const defaultRenderItem = (item, isSelected) => (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-semibold">
          {(item.full_name || item.username || item.name || 'U').substring(0, 1).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {item.full_name || item.name || item.username}
        </div>
        {item.username && item.full_name && (
          <div className="text-xs text-gray-500 truncate">@{item.username}</div>
        )}
      </div>
    </div>
  )

  return (
    <div
      ref={menuRef}
      className={`absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden ${className}`}
      style={{
        ...(position.top !== undefined ? { top: position.top } : {}),
        ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
        right: position.right,
        minWidth: '200px',
        maxWidth: '280px',
        maxHeight: `${maxHeight}px`
      }}
    >
      <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
        {filteredItems.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 text-center">
            {emptyMessage || t('common.noResults')}
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={item.id || index}
              ref={el => itemRefs.current[index] = el}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-indigo-50 text-indigo-900'
                  : 'hover:bg-gray-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent editor blur
                e.stopPropagation()
                onSelect?.(item)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {renderItem ? renderItem(item, index === selectedIndex) : defaultRenderItem(item, index === selectedIndex)}
            </div>
          ))
        )}
      </div>
    </div>
  )
})

MentionMenu.displayName = 'MentionMenu'

export default MentionMenu
