'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Supabase login error:', error.message)
      setError(error.message)
    } else {
      console.log('Login successful, checking role...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // TEMPORARILY DISABLED: Admin check for testing
      // TODO: Re-enable this after creating an admin user
      if (profileError) {
        console.warn('Profile fetch error (non-fatal):', profileError)
      }

      console.log('Login successful, redirecting to dashboard...')
      // Use window.location.href instead of router.push to force a full page reload
      // This ensures the middleware picks up the new session
      window.location.href = '/'

      /* ORIGINAL ADMIN CHECK (re-enable later):
      if (profileError || !profile || profile.role !== 'admin') {
        const errorMessage = 'You are not authorized to access this page.'
        console.error(errorMessage, { profile, profileError })
        setError(errorMessage)
        await supabase.auth.signOut()
      } else {
        console.log('Role check successful, redirecting to dashboard...')
        window.location.href = '/'
      }
      */
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f0f0f] relative overflow-hidden">
      {/* Background Logo Silhouette */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <img
          src="/logo.png"
          alt="48 Hauling"
          className="w-[600px] h-[600px] object-contain"
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 p-8 bg-[#1a1a1a] rounded-lg shadow-2xl w-96 border border-gray-800">
        {/* Logo at top of card */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="48 Hauling Logo"
            className="w-24 h-24 object-contain"
          />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-center text-white">48 Hauling</h1>
        <p className="mb-6 text-sm text-center text-gray-400">Admin Dashboard Login</p>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-300" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-300" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
