"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, Zap } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Supabase istemcisini oluşturuyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Giriş başarısız. E-posta veya şifreni kontrol et.");
      setLoading(false);
    } else {
      // Başarılı giriş sonrası doğrudan stüdyoya gönderiyoruz
      router.push("/studio");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#B4E4FF] flex items-center justify-center p-6 selection:bg-[#FFF67E]">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl p-8 shadow-[12px_12px_0px_0_rgba(0,0,0,1)] relative">
        
        {/* Dekoratif İkon */}
        <div className="absolute -top-8 -left-8 w-16 h-16 bg-[#FFF67E] border-4 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0_rgba(0,0,0,1)] transform -rotate-12">
          <Zap size={32} className="text-black" />
        </div>

        <div className="text-center mb-10 mt-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Hermes.</h1>
          <p className="font-bold text-black/60 uppercase tracking-widest text-sm">Tekrar Hoş Geldin</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#FFB4B4] border-4 border-black rounded-xl font-bold flex items-center gap-3">
            <AlertCircle className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="font-black uppercase tracking-wider text-sm ml-2">E-posta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={20} className="text-black/50" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border-4 border-black text-black font-bold p-4 pl-12 rounded-xl outline-none focus:bg-[#FFF67E] transition-colors placeholder:text-black/30"
                placeholder="mail@ornek.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-black uppercase tracking-wider text-sm ml-2">Şifre</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={20} className="text-black/50" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border-4 border-black text-black font-bold p-4 pl-12 rounded-xl outline-none focus:bg-[#FFF67E] transition-colors placeholder:text-black/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-lg p-4 border-4 border-black rounded-xl shadow-[6px_6px_0px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Giriş Yapılıyor...</span>
              </>
            ) : (
              <>
                <span>Giriş Yap</span>
                <ArrowRight size={24} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="font-bold text-black/60">
            Henüz dijital ikizin yok mu?{" "}
            <Link href="/onboarding" className="text-indigo-600 underline decoration-4 underline-offset-4 hover:text-black transition-colors">
              Hemen Yarat
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}