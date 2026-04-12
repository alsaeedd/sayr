import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * OAuth callback.
 *
 * We deliberately do NOT use `@/lib/supabase/server` here. That helper
 * writes cookies via `next/headers`, which on Cloudflare Workers (OpenNext)
 * does not always propagate onto a redirect response — the session cookie
 * gets dropped and `exchangeCodeForSession` then fails on the next request.
 *
 * Instead we build the redirect response up front and attach Supabase's
 * cookies directly to it. This is the pattern Supabase documents for
 * Route Handlers.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const fail = (reason: string) => {
    // Keep the short flag for existing UI, add a reason for diagnosis.
    const url = new URL('/', origin)
    url.searchParams.set('error', 'auth')
    url.searchParams.set('reason', reason)
    return NextResponse.redirect(url)
  }

  if (!code) return fail('no_code')

  // Build the success redirect first — Supabase will attach session
  // cookies to this exact response object.
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get('cookie')
            ?.split('; ')
            .filter(Boolean)
            .map(c => {
              const eq = c.indexOf('=')
              return eq === -1
                ? { name: c, value: '' }
                : { name: c.slice(0, eq), value: decodeURIComponent(c.slice(eq + 1)) }
            }) ?? []
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Surface it in logs so we can see *why* intermittent failures happen.
    console.error('[auth/callback] exchangeCodeForSession failed:', {
      message: error.message,
      status: error.status,
      name: error.name,
    })
    return fail(error.message.replace(/\s+/g, '_').toLowerCase().slice(0, 60))
  }

  return response
}
