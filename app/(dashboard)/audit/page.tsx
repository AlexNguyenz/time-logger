import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuditLogContent } from '@/components/dashboard/AuditLogContent'

export default async function AuditPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/logger')
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AuditLogContent />
    </div>
  )
}
