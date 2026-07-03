import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-brown-900 rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col border border-brown-100 dark:border-brown-700`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brown-100 dark:border-brown-800">
          <h2 className="text-lg font-bold text-brown-800 dark:text-gold-300">{title}</h2>
          <button
            onClick={onClose}
            className="text-brown-400 hover:text-brown-700 dark:hover:text-gold-400 p-1.5 rounded-xl hover:bg-brown-50 dark:hover:bg-brown-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-brown-100 dark:border-brown-800 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
