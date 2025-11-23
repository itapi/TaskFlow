import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for handling @mention functionality in text inputs
 */
export const useMention = ({
  trigger = '@',
  onMentionSelect
} = {}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [filterText, setFilterText] = useState('')
  const [triggerIndex, setTriggerIndex] = useState(-1)

  const inputRef = useRef(null)
  const menuRef = useRef(null)

  // Close the menu
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    setFilterText('')
    setTriggerIndex(-1)
  }, [])

  // Handle input change - detect trigger character
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    // Use setTimeout to ensure cursor position is updated after React's setState
    const cursorPos = e.target.selectionStart ?? value.length

    console.log('handleInputChange called:', { value, cursorPos })

    // Find the last trigger character before cursor
    let lastTriggerPos = -1
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (value[i] === trigger) {
        // Check if it's at the start or preceded by a space
        if (i === 0 || /\s/.test(value[i - 1])) {
          lastTriggerPos = i
          break
        }
      }
      // Stop if we hit a space (no trigger in current word)
      if (/\s/.test(value[i])) {
        break
      }
    }

    if (lastTriggerPos !== -1) {
      // Extract text after trigger
      const textAfterTrigger = value.substring(lastTriggerPos + 1, cursorPos)

      // Don't show menu if there's a space in the filter text
      if (!/\s/.test(textAfterTrigger)) {
        console.log('Mention trigger detected!', { lastTriggerPos, textAfterTrigger })
        setTriggerIndex(lastTriggerPos)
        setFilterText(textAfterTrigger)

        // Position menu above the input (since input is often at bottom of modals)
        const input = e.target
        setMenuPosition({
          bottom: input.offsetHeight + 4,
          left: 0
        })

        setIsMenuOpen(true)
        return
      }
    }

    // Close menu if no valid trigger
    setIsMenuOpen(false)
  }, [trigger])

  // Handle key down - delegate to menu for navigation
  const handleKeyDown = useCallback((e) => {
    if (isMenuOpen && menuRef.current) {
      const handled = menuRef.current.handleKeyDown(e)
      if (handled) {
        return true
      }
    }
    return false
  }, [isMenuOpen])

  // Handle mention selection
  const handleSelect = useCallback((item) => {
    if (!inputRef.current || triggerIndex === -1) return

    const input = inputRef.current
    const value = input.value
    const cursorPos = input.selectionStart

    // Get the mention text to insert
    const mentionText = `@${item.username || item.name} `

    // Replace trigger + filter text with mention
    const before = value.substring(0, triggerIndex)
    const after = value.substring(cursorPos)
    const newValue = before + mentionText + after

    // Update input value using native setter for React controlled input
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set

    nativeInputValueSetter?.call(input, newValue)

    // Trigger input event for React
    const event = new Event('input', { bubbles: true })
    input.dispatchEvent(event)

    // Set cursor position after mention
    const newCursorPos = triggerIndex + mentionText.length
    setTimeout(() => {
      input.focus()
      input.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)

    closeMenu()
    onMentionSelect?.(item)
  }, [triggerIndex, onMentionSelect, closeMenu])

  // Bind ref to input element
  const bindInput = useCallback((element) => {
    inputRef.current = element
  }, [])

  // Bind ref to menu component
  const bindMenu = useCallback((element) => {
    menuRef.current = element
  }, [])

  return {
    isMenuOpen,
    menuPosition,
    filterText,
    inputRef,
    menuRef,
    bindInput,
    bindMenu,
    handleInputChange,
    handleKeyDown,
    handleSelect,
    closeMenu
  }
}

export default useMention
