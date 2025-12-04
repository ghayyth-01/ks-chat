// lib/auth.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const getSupabaseServerClient = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookieStore: any = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
};

export const getSession = async () => {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
};
