import { toast } from 'react-toastify'

// Helper functions for consistent toast messaging
export const toastSuccess = (message) => {
  toast.success(message)
}

export const toastError = (message) => {
  toast.error(message)
}

export const toastWarning = (message) => {
  toast.warning(message)
}

export const toastInfo = (message) => {
  toast.info(message)
}

// Aliases for alternative naming convention
export const showSuccessToast = toastSuccess
export const showErrorToast = toastError
export const showWarningToast = toastWarning
export const showInfoToast = toastInfo

// Common success messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'התחברת בהצלחה!',
  LOGOUT: 'התנתקת בהצלחה!',
  SAVE: 'הנתונים נשמרו בהצלחה',
  UPDATE: 'עודכן בהצלחה',
  DELETE: 'נמחק בהצלחה',
  SEND: 'נשלח בהצלחה',
  UPLOAD: 'הועלה בהצלחה',
  ASSIGN: 'הוקצה בהצלחה',
  CLOSE: 'נסגר בהצלחה',
  SYNC: 'סונכרן בהצלחה'
}

// Common error messages
export const ERROR_MESSAGES = {
  LOGIN: 'שם משתמש או סיסמה שגויים',
  LOGOUT: 'שגיאה בהתנתקות',
  SAVE: 'שגיאה בשמירת הנתונים',
  LOAD: 'שגיאה בטעינת הנתונים',
  UPDATE: 'שגיאה בעדכון',
  DELETE: 'שגיאה במחיקה',
  SEND: 'שגיאה בשליחה',
  UPLOAD: 'שגיאה בהעלאה',
  NETWORK: 'שגיאת רשת - בדוק את החיבור לאינטרנט',
  PERMISSION: 'אין לך הרשאות לביצוע פעולה זו',
  VALIDATION: 'נא למלא את כל השדות הנדרשים',
  NOT_FOUND: 'הפריט המבוקש לא נמצא',
  ASSIGN: 'שגיאה בהקצאה',
  CLOSE: 'שגיאה בסגירה',
  SYNC: 'שגיאה בסינכרון'
}