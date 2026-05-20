import { getUserRole } from '@/utils/supabase/queries'
import DashboardClient from './DashboardClient'

export default async function Page() {
  const role = await getUserRole()
  
  return (
    <DashboardClient role={role} />
  )
}
