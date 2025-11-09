import React from 'react'
import { useModal } from '../contexts/ModalContext'
import { Modal } from './Modal/Modal'
import ConfirmModal from './Modal/ConfirmModal'
import FormModal from './Modal/FormModal'

const GlobalModal = () => {
  const { modalState, closeModal } = useModal()

  const renderModalContent = () => {
    switch (modalState.type) {
      case 'confirm':
        return (
          <ConfirmModal
            message={modalState.content}
            onConfirm={modalState.onConfirm}
            onCancel={modalState.onCancel}
            {...modalState.props}
          />
        )
      case 'form':
        return (
          <FormModal
            fields={modalState.fields}
            onSubmit={async (data) => {
              try {
                await modalState.onSubmit(data)
                closeModal()
              } catch (error) {
                // Error is handled by the form component
                throw error
              }
            }}
            onCancel={closeModal}
          />
        )
      default:
        return modalState.content
    }
  }

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={modalState.onCancel || closeModal}
      title={modalState.title}
      size={modalState.size}
      showCloseButton={modalState.type !== 'confirm'}
      footer={modalState.footer}
    >
      {renderModalContent()}
    </Modal>
  )
}

export default GlobalModal