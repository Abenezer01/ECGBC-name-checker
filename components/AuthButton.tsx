import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/components'

export default async function AuthButton() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const signOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/login')
  }

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">Hey, {user.email}!</span>
      <form action={signOut}>
        <Button variant="outline" size="sm">
          Logout
        </Button>
      </form>
    </div>
  ) : null
}
