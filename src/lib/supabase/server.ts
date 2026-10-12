import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { isDemo } from "@/lib/mode";

// cache(): satu client per request, meski dipanggil dari banyak tempat
export const createClient = cache(async () => {
  if (isDemo()) return (await import("@/lib/demo")).createDemoClient();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // dipanggil dari Server Component; sesi diperbarui oleh proxy
          }
        },
      },
    },
  );
});
