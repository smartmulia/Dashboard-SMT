import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Email dan password wajib diisi')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brown-950 via-brown-900 to-brown-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brown-800/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo area */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex gap-4 mb-4">
              <img src="/logos/logo-serbamas.png" alt="Serba Mas" className="h-14 object-contain" />
              <div className="w-px bg-gold-500/30" />
              <img src="/logos/logo-volary.png" alt="Volary" className="h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white">Dashboard SMT</h1>
            <p className="text-gold-400/80 text-sm mt-1">Sistem Monitoring Elektronik</p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
            <span className="text-gold-400/60 text-xs">MASUK KE SISTEM</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gold-300 text-sm font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@perusahaan.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-gold-300 text-sm font-medium block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-500 to-gold-400 text-brown-900 font-bold py-3 rounded-xl hover:from-gold-400 hover:to-gold-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-brown-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6">
            © 2024 Serba Mas Tentram Group
          </p>
        </div>
      </div>
    </div>
  )
}
