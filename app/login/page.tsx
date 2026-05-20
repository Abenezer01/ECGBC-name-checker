import { login, signup } from './actions'
import { Button, Card } from '@/components/ui/components'
import { ShieldCheck, Mail, Lock } from 'lucide-react'

export default async function LoginPage(props: { searchParams: Promise<{ error?: string, message?: string }> }) {
  const searchParams = await props.searchParams;
  const errorMessage = searchParams?.error;
  const successMessage = searchParams?.message;

  return (
    <div className="flex bg-slate-50 min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <div className="h-8 w-8 bg-slate-900 rounded-md flex items-center justify-center font-bold text-white shadow-sm">E</div>
        <span className="text-sm font-semibold tracking-tight text-slate-900">ECGBC Name Portal</span>
      </div>

      <Card className="w-full max-w-md p-8 shadow-lg shadow-slate-200/40 border-slate-200/60">
        <div className="flex flex-col items-center space-y-2 text-center mb-8">
          <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500">
            Enter your credentials to access the portal
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-700 p-3 mb-6 rounded-md text-sm border border-red-200 relative">
            {errorMessage}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-emerald-50 text-emerald-700 p-3 mb-6 rounded-md text-sm border border-emerald-200 relative">
            {successMessage}
          </div>
        )}

        <form className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="email">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                className="flex h-10 w-full pl-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-50"
                id="email" 
                name="email" 
                type="email" 
                required 
                placeholder="name@organization.org"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-900" htmlFor="password">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                className="flex h-10 w-full pl-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-50"
                id="password" 
                name="password" 
                type="password" 
                required 
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button formAction={login} className="w-full inline-flex justify-center items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors">Sign In</button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or</span>
              </div>
            </div>
            <button formAction={signup} className="w-full inline-flex justify-center items-center rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors">Create New Account</button>
          </div>
        </form>
      </Card>
      
      <p className="text-center text-xs text-slate-500 mt-8 max-w-xs">
        By continuing, you confirm you are authorized to access the organization&apos;s information system.
      </p>
    </div>
  )
}
