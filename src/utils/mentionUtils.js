import apiClient from './api'

/**
 * Extract mentioned usernames from text
 * Supports both plain text mentions (@username) and HTML mentions
 * @param {string} text - Text containing mentions
 * @returns {Array<string>} Array of unique usernames
 */
export const extractMentions = (text) => {
  if (!text) return []

  const mentions = new Set()

  // Extract from plain text mentions (@username followed by space or end of string)
  const plainTextRegex = /@(\w+)/g
  let match
  while ((match = plainTextRegex.exec(text)) !== null) {
    mentions.add(match[1])
  }

  // Extract from HTML mentions (data-user-id in span elements)
  // This is for Jodit editor mentions
  const htmlRegex = /@(\w+)/g
  while ((match = htmlRegex.exec(text)) !== null) {
    mentions.add(match[1])
  }

  return Array.from(mentions)
}

/**
 * Extract mentioned user IDs from HTML content (Jodit editor)
 * @param {string} htmlContent - HTML content from Jodit editor
 * @returns {Array<number>} Array of unique user IDs
 */
export const extractMentionUserIds = (htmlContent) => {
  if (!htmlContent) return []

  const userIds = new Set()
  const regex = /data-user-id="(\d+)"/g
  let match

  while ((match = regex.exec(htmlContent)) !== null) {
    userIds.add(parseInt(match[1]))
  }

  return Array.from(userIds)
}

/**
 * Send mention notification emails to mentioned users
 * @param {Array<Object>} mentionedUsers - Array of user objects that were mentioned
 * @param {Object} context - Context object with details about where they were mentioned
 * @param {string} context.type - Type of mention ('task' or 'comment')
 * @param {string} context.taskTitle - Title of the task
 * @param {string} context.projectName - Name of the project (optional)
 * @param {string} context.mentionedBy - Name of the user who mentioned them
 * @param {string} context.content - The content containing the mention
 * @param {string} context.taskUrl - URL to the task (optional)
 */
export const sendMentionNotifications = async (mentionedUsers, context) => {
  if (!mentionedUsers || mentionedUsers.length === 0) return

  const {
    type,
    taskTitle,
    projectName,
    mentionedBy,
    content,
    taskUrl
  } = context

  const notifications = mentionedUsers.map(async (user) => {
    try {
      // Prepare email subject
      const subject = type === 'task'
        ? `You were mentioned in task: ${taskTitle}`
        : `You were mentioned in a comment on: ${taskTitle}`

      // Prepare email body (HTML)
      const message = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">👋 You were mentioned!</h1>
              </div>

              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  <strong>${mentionedBy}</strong> mentioned you in ${type === 'task' ? 'a task' : 'a comment'}:
                </p>

                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 20px;">
                  <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937;">📋 ${taskTitle}</h2>
                  ${projectName ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Project: ${projectName}</p>` : ''}
                </div>

                ${type === 'comment' ? `
                  <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #4b5563; font-size: 14px;">${content.replace(/<[^>]*>/g, '').substring(0, 200)}${content.length > 200 ? '...' : ''}</p>
                  </div>
                ` : ''}

                ${taskUrl ? `
                  <a href="${taskUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
                    View Task
                  </a>
                ` : ''}

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  This is an automated notification from TaskFlow. Please do not reply to this email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `

      // Send email
      const response = await apiClient.sendEmail(
        user.email,
        subject,
        message
      )

      if (response.success) {
        console.log(`Mention notification sent to ${user.email}`)
      } else {
        console.error(`Failed to send mention notification to ${user.email}:`, response.message)
      }

      return response
    } catch (error) {
      console.error(`Error sending mention notification to ${user.email}:`, error)
      return { success: false, error: error.message }
    }
  })

  // Send all notifications in parallel
  return Promise.allSettled(notifications)
}

/**
 * Find mentioned users from text and return user objects
 * @param {string} text - Text containing mentions
 * @param {Array<Object>} allUsers - Array of all available users
 * @returns {Array<Object>} Array of mentioned user objects
 */
export const getMentionedUsers = (text, allUsers) => {
  const mentionedUsernames = extractMentions(text)

  if (mentionedUsernames.length === 0) return []

  return allUsers.filter(user =>
    mentionedUsernames.includes(user.username)
  )
}

/**
 * Find mentioned users from HTML content (Jodit editor) by user IDs
 * @param {string} htmlContent - HTML content from Jodit editor
 * @param {Array<Object>} allUsers - Array of all available users
 * @returns {Array<Object>} Array of mentioned user objects
 */
export const getMentionedUsersFromHtml = (htmlContent, allUsers) => {
  const mentionedUserIds = extractMentionUserIds(htmlContent)

  if (mentionedUserIds.length === 0) {
    // Fallback to username extraction
    return getMentionedUsers(htmlContent, allUsers)
  }

  return allUsers.filter(user =>
    mentionedUserIds.includes(parseInt(user.id))
  )
}
