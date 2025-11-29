import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/shared/Header'
import { LoggerContent } from '@/components/logger/LoggerContent'
import { Profile } from '@/lib/types'

export default async function LoggerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Try to get existing profile
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If no profile exists, create one
  if (!profile) {
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        role: 'user',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      redirect('/?error=profile_creation_failed')
    }

    profile = newProfile
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header profile={profile as Profile} />
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <LoggerContent userId={user.id} />
      </main>
    </div>
  )
}
