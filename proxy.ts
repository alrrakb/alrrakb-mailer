import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { session } } = await supabase.auth.getSession()

    const path = request.nextUrl.pathname;

    // Public Routes (No Auth Needed)
    if (path === '/login' || path.startsWith('/auth')) {
        if (session) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return response;
    }

    // Protected Routes (Everything else)
    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Root Redirect
    if (path === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirect if logged in
    if (session && request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Root redirect
    if (request.nextUrl.pathname === '/') {
        return session
            ? NextResponse.redirect(new URL('/dashboard', request.url))
            : NextResponse.redirect(new URL('/login', request.url));
    }

    return response
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
