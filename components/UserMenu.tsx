'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/components'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings } from 'lucide-react'

export function UserMenu() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
      }
    })
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!userEmail) return null

  // Generate initials
  const initials = userEmail.substring(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3">
      {/* User Info (Desktop only) */}
      <div className="hidden md:flex flex-col items-end justify-center">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
          {userEmail.split('@')[0]}
        </span>
        <span className="text-xs text-slate-500 font-medium">Administrator</span>
      </div>

      {/* Avatar Plate */}
      <div className="relative group">
        <div className="flex items-center justify-center h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200/50 shadow-sm cursor-pointer hover:bg-indigo-200 transition-colors">
          {initials}
        </div>
        
        {/* Dropdown Menu (Hover based for quick access, or use click based state if preferred. We'll use absolute hidden group-hover:block for simplicity, tailored nicely) */}
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 border-b border-slate-100 mb-1 pointer-events-none">
              <p className="text-xs text-slate-500 font-medium">Signed in as</p>
              <p className="text-sm font-bold text-slate-900 truncate">{userEmail}</p>
            </div>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-md transition-colors cursor-pointer">
              <User className="w-4 h-4" /> Profile
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-md transition-colors cursor-pointer">
              <Settings className="w-4 h-4" /> Account Settings
            </button>
            <div className="border-t border-slate-100 my-1 pb-1"></div>
            <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
