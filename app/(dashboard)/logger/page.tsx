import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoggerContent } from '@/components/logger/LoggerContent'

export default async function LoggerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <LoggerContent userId={user.id} />
    </div>
  )
}
