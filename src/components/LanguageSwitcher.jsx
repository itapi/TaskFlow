import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'he' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('TaskFlow_language', newLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      title={i18n.language === 'en' ? 'Switch to Hebrew' : 'עבור לאנגלית'}
    >
      <Languages className="w-5 h-5" />
      <span className="font-semibold">
        {i18n.language === 'en' ? 'English' : 'עברית'}
      </span>
    </button>
  )
}

export default LanguageSwitcher
