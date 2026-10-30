import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') as EmailOtpType) || 'signup'
  
  const redirectTo = request.nextUrl.clone()

  if (token_hash) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // සාර්ථකයි! දැන් Login එකට යවන්න, සුබ පැතුම් එකක් එක්ක
      redirectTo.pathname = '/login'
      redirectTo.searchParams.set('message', 'Account confirmed successfully! You can now sign in.')
      return NextResponse.redirect(redirectTo)
    }
  }

  // අවුලක් ගියොත් Login එකට යවන්න Error එකක් එක්ක
  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'Could not verify email link. It may have expired.')
  return NextResponse.redirect(redirectTo)
}