import React, { createContext, useContext, useState } from 'react'

const ModalContext = createContext()

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null,
    title: '',
    content: null,
    fields: null,
    onSubmit: null,
    props: {},
    onConfirm: null,
    onCancel: null,
    size: 'lg',
    footer: null
  })

  const openModal = ({
    type,
    title,
    content,
    fields,
    onSubmit,
    message,
    confirmText,
    confirmVariant,
    props = {},
    onConfirm,
    onCancel,
    size = 'lg',
    footer = null
  }) => {
    // Handle confirm modals
    if (type === 'confirm') {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title,
        content: message,
        fields: null,
        onSubmit: null,
        props: { confirmText, cancelText: 'Cancel', variant: confirmVariant || 'danger', ...props },
        onConfirm: async () => {
          try {
            if (onConfirm) await onConfirm()
            closeModal()
          } catch (error) {
            console.error('Confirm action failed:', error)
          }
        },
        onCancel: () => {
          if (onCancel) onCancel()
          closeModal()
        },
        size,
        footer
      })
      return
    }

    // Handle form modals
    if (fields) {
      setModalState({
        isOpen: true,
        type: 'form',
        title,
        content: null,
        fields,
        onSubmit,
        props,
        onConfirm: null,
        onCancel: () => closeModal(),
        size,
        footer
      })
      return
    }

    // Handle custom content modals
    setModalState({
      isOpen: true,
      type,
      title,
      content,
      fields: null,
      onSubmit: null,
      props,
      onConfirm,
      onCancel,
      size,
      footer
    })
  }

  const closeModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }))

    // Clear modal after animation
    setTimeout(() => {
      setModalState({
        isOpen: false,
        type: null,
        title: '',
        content: null,
        fields: null,
        onSubmit: null,
        props: {},
        onConfirm: null,
        onCancel: null,
        size: 'lg',
        footer: null
      })
    }, 300)
  }

  const openConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'אישור', cancelText = 'ביטול', variant = 'danger' }) => {
    openModal({
      type: 'confirm',
      title,
      content: message,
      props: { confirmText, cancelText, variant },
      onConfirm: () => {
        onConfirm?.()
        closeModal()
      },
      onCancel: () => {
        onCancel?.()
        closeModal()
      }
    })
  }

  return (
    <ModalContext.Provider value={{
      modalState,
      openModal,
      closeModal,
      openConfirmModal
    }}>
      {children}
    </ModalContext.Provider>
  )
}