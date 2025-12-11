"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: Error | null;
    data: Session | null;
  }>;
  signOut: () => Promise<void>;
  userRole: "ADMIN" | "USER" | "VIP" | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"ADMIN" | "USER" | "VIP" | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    // Oturum bilgisini ve kullanıcı rolünü yükle
    const loadUserData = async () => {
      setLoading(true);

      // Mevcut oturumu al
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Oturum yüklenirken hata:", sessionError);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Kullanıcı giriş yapmışsa rolünü al
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("role, email")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Kullanıcı rolü yüklenirken hata:", error);
          } else if (data) {
            setUserRole(data.role);
          }
        } catch (err) {
          console.error("Rol sorgusunda hata:", err);
        }
      } else {
        setUserRole(null);
      }

      setLoading(false);
    };

    // İlk yüklemede kullanıcı verilerini al
    loadUserData();

    // Oturum değişikliklerini dinle
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        // Sadece oturum değiştiğinde işlem yap
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED"
        ) {
          loadUserData();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null; data: Session | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return {
        error: error ?? new Error("No session returned"),
        data: null,
      };
    }

    return {
      error: null,
      data: data.session,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();

    // Cookie'yi temizle
    document.cookie = "sb-auth-token=; path=/; max-age=0; SameSite=Lax";

    router.push("/login");
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
