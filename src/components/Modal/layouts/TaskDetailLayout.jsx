import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import JoditEditor from 'jodit-react'
import apiClient from '../../../utils/api'
import { useGlobalState, useSystemUsers } from '../../../contexts/GlobalStateContext'
import { useMention } from '../../../hooks/useMention'
import MentionMenu from '../../MentionMenu'
import {
  Send,
  Calendar,
  User,
  Flag,
  MessageSquare,
  Edit2,
  Trash2
} from 'lucide-react'
import '../../jodit.css'

export const TaskDetailLayout = forwardRef(({ data }, ref) => {
  const { t } = useTranslation()
  const { state, closeModal } = useGlobalState()
  const { users: systemUsers, loaded: usersLoaded, fetchUsers } = useSystemUsers()
  const currentUser = state.user

  const { task, users = [], statuses = [], onTaskUpdate, onEditTask, onDeleteTask } = data

  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const messagesEndRef = useRef(null)
  const commentInputRef = useRef(null)
  const commentEditorRef = useRef(null)

  // Mention state for Jodit integration
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, right: 0 })
  const mentionStartPos = useRef(null)
  const joditInstanceRef = useRef(null)
  const mentionMenuRef = useRef(null)

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
        setNewComment(content)
      } catch (err) {
        console.error('Error inserting mention:', err)
      }
    }, 10)
  }

  // Close mention menu
  const closeMentionMenu = () => {
    setMentionOpen(false)
    setMentionFilter('')
    mentionStartPos.current = null
  }

  // Refs to hold current state values for use in Jodit events (to avoid stale closures)
  const mentionOpenRef = useRef(mentionOpen)
  const mentionFilterRef = useRef(mentionFilter)

  // Keep refs in sync with state
  useEffect(() => {
    mentionOpenRef.current = mentionOpen
  }, [mentionOpen])

  useEffect(() => {
    mentionFilterRef.current = mentionFilter
  }, [mentionFilter])

  // Compact Jodit config for comments - no state dependencies to prevent re-init
  const commentEditorConfig = useMemo(() => ({
    direction: 'rtl',
    language: 'he',
    toolbarAdaptive: false,
    toolbarSticky: false,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    minHeight: 120,
    maxHeight: 200,
    enter: 'DIV',
    placeholder: t('comments.writeComment'),
    buttons: [
      'bold', 'italic', 'underline', '|',
      'ul', 'ol', '|',
      'link', '|',
      'eraser'
    ],
    buttonsMD: [
      'bold', 'italic', '|',
      'ul', 'ol', '|',
      'link'
    ],
    buttonsSM: [
      'bold', 'italic', '|',
      'ul', 'ol'
    ],
    buttonsXS: [
      'bold', 'italic', 'ul'
    ],
    uploader: {
      insertImageAsBase64URI: true
    },
    style: {
      font: '14px Arial, sans-serif'
    },
    events: {
      afterInit: (editor) => {
        joditInstanceRef.current = editor
      },
      keyup: (e) => {
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

        // Close menu if no valid mention context (use ref to get current value)
        if (mentionOpenRef.current) {
          closeMentionMenu()
        }
      },
      keydown: (e) => {
        // Handle keyboard navigation for mention menu (use ref to get current value)
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

  // Mention hook for @mentions in comments
  const mention = useMention({
    trigger: '@',
    onMentionSelect: (user) => {
      console.log('Mentioned user:', user)
    }
  })

  // Fetch system users for mentions
  useEffect(() => {
    if (!usersLoaded) {
      fetchUsers()
    }
  }, [usersLoaded, fetchUsers])

  useImperativeHandle(ref, () => ({
    submitForm: () => {
      // No form submission needed for this layout
    }
  }))

  useEffect(() => {
    if (task) {
      loadComments()
    }
  }, [task])

  useEffect(() => {
    scrollToBottom()
  }, [comments])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadComments = async () => {
    if (!task) return

    try {
      setLoadingComments(true)
      const response = await apiClient.getComments(task.id)
      if (response.success) {
        setComments(response.data || [])
      }
    } catch (err) {
      console.error('Error loading comments:', err)
      toast.error(t('messages.error'))
    } finally {
      setLoadingComments(false)
    }
  }

  // Helper to check if HTML content is empty
  const isHtmlEmpty = (html) => {
    if (!html) return true
    const stripped = html.replace(/<[^>]*>/g, '').trim()
    return stripped.length === 0
  }

  const handleSendComment = async () => {
    if (isHtmlEmpty(newComment) || !task || sendingComment) return

    try {
      setSendingComment(true)
      const response = await apiClient.addComment(task.id, newComment.trim())

      if (response.success) {
        setComments(prev => [...prev, response.data])
        setNewComment('')
        if (onTaskUpdate) {
          onTaskUpdate(task.id, 'comment_added')
        }
      } else {
        throw new Error(response.error || 'Failed to add comment')
      }
    } catch (err) {
      toast.error(err.message || t('messages.error'))
      console.error('Error sending comment:', err)
    } finally {
      setSendingComment(false)
    }
  }

  const handleEditComment = async (commentId) => {
    if (!editingCommentText.trim()) return

    try {
      const response = await apiClient.updateComment(commentId, editingCommentText.trim())
      if (response.success) {
        setComments(prev => prev.map(c =>
          c.id === commentId
            ? { ...c, comment: editingCommentText.trim(), is_edited: true }
            : c
        ))
        setEditingCommentId(null)
        setEditingCommentText('')
        toast.success(t('messages.updateSuccess'))
      }
    } catch (err) {
      toast.error(err.message || t('messages.error'))
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm(t('messages.confirmDelete'))) return

    try {
      const response = await apiClient.deleteComment(commentId)
      if (response.success) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        toast.success(t('messages.deleteSuccess'))
      }
    } catch (err) {
      toast.error(err.message || t('messages.error'))
    }
  }

  const startEditingComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.comment)
  }

  const cancelEditingComment = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'text-green-600 bg-green-50 border-green-200',
      'medium': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'high': 'text-orange-600 bg-orange-50 border-orange-200',
      'urgent': 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getStatusColor = (statusId) => {
    const status = statuses.find(s => s.id === statusId)
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800'
    }
    return colorClasses[status?.color] || 'bg-gray-100 text-gray-800'
  }

  const getAssignedUser = (userId) => {
    return users.find(u => u.id === userId)
  }

  if (!task) return null

  const assignedUser = getAssignedUser(task.assigned_to)
  const status = statuses.find(s => s.id === task.status)

  const CommentItem = ({ comment }) => {
    const isOwner = currentUser?.id === comment.user_id
    const isEditing = editingCommentId === comment.id

    return (
      <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user_avatar ? (
            <img
              src={comment.user_avatar}
              alt={comment.user_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {(comment.user_name || 'U').substring(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">
                {comment.user_name}
              </span>
              <span className="text-xs text-gray-500">
                {formatDateTime(comment.created_at)}
              </span>
              {(comment.is_edited === true || comment.is_edited === 1 || comment.is_edited === '1') && (
                <span className="text-xs text-gray-400 italic">
                  ({t('comments.edited')})
                </span>
              )}
            </div>

            {/* Actions */}
            {isOwner && !isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditingComment(comment)}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title={t('common.edit')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Comment Text or Edit Input */}
          {isEditing ? (
            <div className="mt-2">
              <div className="jodit-comment-editor">
                <JoditEditor
                  value={editingCommentText}
                  config={commentEditorConfig}
                  onBlur={(content) => setEditingCommentText(content)}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={cancelEditingComment}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: comment.comment }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(90vh - 180px)', minHeight: '400px' }}>
      {/* Task Details Header - Compact with max height */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100 bg-white overflow-y-auto" style={{ maxHeight: '35%' }}>
        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mb-3">
          {onEditTask && (
            <button
              onClick={() => {
                closeModal()
                onEditTask(task)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t('common.edit')}
            </button>
          )}
          {onDeleteTask && (
            <button
              onClick={() => {
                closeModal()
                onDeleteTask(task)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          )}
        </div>

        {/* Task Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Status */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.status')}
            </label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {status?.label || task.status}
              </span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.priority')}
            </label>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3" />
                {t(`tasks.priorities.${task.priority}`)}
              </span>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.assignedTo')}
            </label>
            <div className="mt-1 flex items-center gap-2">
              {assignedUser ? (
                <>
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {(assignedUser.full_name || assignedUser.username).substring(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-900">
                    {assignedUser.full_name || assignedUser.username}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">{t('tasks.unassigned')}</span>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.dueDate')}
            </label>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              {task.due_date ? (
                <>
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className={new Date(task.due_date) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}>
                    {formatDate(task.due_date)}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.description')}
            </label>
            <div
              className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          </div>
        )}
      </div>

      {/* Comments Section - Takes remaining space (min 60%) */}
      <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: '60%' }}>
        {/* Comments Header */}
        <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-gray-900">
              {t('comments.title')}
            </h3>
            <span className="text-sm text-gray-500">
              ({comments.length})
            </span>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loadingComments ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">{t('common.loading')}</span>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>{t('comments.noComments')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Add Comment Input */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-white">
          <div className="jodit-comment-editor relative">
            <JoditEditor
              ref={commentEditorRef}
              value={newComment}
              config={commentEditorConfig}
              onBlur={(content) => setNewComment(content)}
            />
            {/* Mention Menu for Jodit */}
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
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSendComment}
              disabled={isHtmlEmpty(newComment) || sendingComment}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isHtmlEmpty(newComment) || sendingComment
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {sendingComment ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('comments.send')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

TaskDetailLayout.displayName = 'TaskDetailLayout'

export default TaskDetailLayout
