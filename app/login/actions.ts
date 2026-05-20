'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = Object.fromEntries(formData.entries())
  const email = data.email as string
  const password = data.password as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Error logging in:', error)
    
    let errorMsg = error.message
    if (errorMsg.toLowerCase().includes('email not confirmed')) {
      errorMsg = 'Email not confirmed. Please check your email inbox to verify, or disable "Confirm email" in your Supabase project (Auth > Providers > Email).'
    }
    
    redirect('/login?error=' + encodeURIComponent(errorMsg))
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = Object.fromEntries(formData.entries())
  const email = data.email as string
  const password = data.password as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Error signing up:', error)
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  // usually redirect to login screen with success message if email verification needed
  // or they get signed in automatically if email verification is off. We'll show a message either way.
  redirect('/login?message=' + encodeURIComponent('Check email to continue sign in process, or try logging in if email confirmation is disabled.'))
}
