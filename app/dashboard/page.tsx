import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/shared/Header'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/logger')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header profile={profile} />
      <main className="container mx-auto max-w-7xl px-4 py-6">
        <DashboardContent />
      </main>
    </div>
  )
}
