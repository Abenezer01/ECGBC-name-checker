import { NextResponse, NextRequest } from 'next/server';
import { getUserRole } from '@/utils/supabase/queries';

export async function GET(req: NextRequest) {
  const role = await getUserRole();
  return NextResponse.json({ role_is: role });
}
