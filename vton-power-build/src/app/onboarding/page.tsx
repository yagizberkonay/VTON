"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, Sparkles, UploadCloud, Info, CheckCircle2, User, Ruler } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function OnboardingPage() {
  const router = useRouter();
  
  // Genel State'ler
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 1. Aşama State'leri (Kayıt)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // 2. Aşama State'leri (Profil & Fotoğraf)
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. AŞAMA: KAYIT OLMA İŞLEMİ ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError("Kayıt başarısız. Şifreniz çok kısa olabilir veya bu e-posta kullanımda.");
      setLoading(false);
    } else if (data.user) {
      setUserId(data.user.id);
      setStep(2); // Başarılıysa 2. Aşamaya geç
      setLoading(false);
    }
  };

  // --- 2. AŞAMA: FOTOĞRAF SEÇİMİ VE ÖNİZLEME ---
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // --- 2. AŞAMA: PROFİLİ KAYDET VE STÜDYOYA GİT ---
  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !height || !weight || !userId) {
      setError("Lütfen tüm alanları doldur ve bir fotoğraf yükle.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fotoğrafı Supabase Storage 'avatars' bucket'ına yükle
      const fileExt = photo.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(fileName, photo);

      if (uploadError) throw uploadError;

      // 2. Yüklenen fotoğrafın Public URL'ini al
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 3. Kullanıcı verilerini public.profiles tablosuna kaydet
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: publicUrl,
          height: height,
          weight: weight,
        });

      if (profileError) throw profileError;

      // Her şey tamamsa Stüdyoya yönlendir
      router.push("/studio");
      router.refresh();
      
    } catch (err: any) {
      setError(err.message || "Profil oluşturulurken bir hata oluştu.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFB4B4] flex items-center justify-center p-6 selection:bg-[#FFF67E]">
      <div className={`w-full bg-white border-4 border-black rounded-3xl p-8 shadow-[12px_12px_0px_0_rgba(0,0,0,1)] relative transition-all duration-500 ${step === 2 ? 'max-w-2xl' : 'max-w-md'}`}>
        
        {/* Dekoratif İkon */}
        <div className="absolute -top-8 -left-8 w-16 h-16 bg-[#FFF67E] border-4 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0_rgba(0,0,0,1)] transform -rotate-12">
          {step === 1 ? <Sparkles size={32} className="text-black" /> : <User size={32} className="text-black" />}
        </div>

        {error && (
          <div className="mb-6 mt-4 p-4 bg-red-100 border-4 border-black rounded-xl font-bold flex items-center gap-3">
            <AlertCircle className="shrink-0 text-red-600" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* --- ADIM 1: KAYIT EKRANI --- */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10 mt-4">
              <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Hermes.</h1>
              <p className="font-bold text-black/60 uppercase tracking-widest text-sm">Dijital İkizini Yarat</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
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
                    className="w-full bg-gray-50 border-4 border-black text-black font-bold p-4 pl-12 rounded-xl outline-none focus:bg-[#B4E4FF] transition-colors placeholder:text-black/30"
                    placeholder="mail@ornek.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-black uppercase tracking-wider text-sm ml-2">Şifre Belirle</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={20} className="text-black/50" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border-4 border-black text-black font-bold p-4 pl-12 rounded-xl outline-none focus:bg-[#B4E4FF] transition-colors placeholder:text-black/30"
                    placeholder="En az 6 karakter"
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-lg p-4 border-4 border-black rounded-xl shadow-[6px_6px_0px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <span>Devam Et</span>}
                {!loading && <ArrowRight size={24} />}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="font-bold text-black/60">
                Zaten bir hesabın var mı?{" "}
                <Link href="/login" className="text-indigo-600 underline decoration-4 underline-offset-4 hover:text-black transition-colors">
                  Giriş Yap
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* --- ADIM 2: DİJİTAL İKİZ KURULUMU --- */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8 mt-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Fiziksel Profilin</h2>
              <p className="font-bold text-black/60 uppercase tracking-widest text-sm">Yapay Zeka Seni Tanımalı</p>
            </div>

            <form onSubmit={handleProfileSetup} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Sol Taraf: İpuçları ve Fiziksel Veriler */}
              <div className="space-y-6">
                <div className="bg-[#FFF67E] border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-2 mb-3 border-b-4 border-black pb-2">
                    <Info size={20} className="text-black" />
                    <h3 className="font-black uppercase tracking-wider text-sm">Mükemmel Sonuç İçin</h3>
                  </div>
                  <ul className="text-sm font-bold text-black/80 space-y-2">
                    <li>• <span className="text-black">Kamera Açısı:</span> Kameraya tam karşıdan bak ve dik dur.</li>
                    <li>• <span className="text-black">Işık:</span> Yüzün aydınlık ve gölgesiz olmalı (Gün ışığı idealdir).</li>
                    <li>• <span className="text-black">İfade:</span> Nötr bir yüz ifadesi kullan. Mimik yapmamaya çalış.</li>
                    <li className="pt-2 text-indigo-700">Hermes yüzünü estetikleştirmez (Anti-beautification). Tamamen gerçek seni yansıtır.</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="font-black uppercase tracking-wider text-xs ml-2">Boy (cm)</label>
                    <input
                      type="number"
                      required
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="175"
                      className="w-full bg-gray-50 border-4 border-black text-black font-bold p-3 rounded-xl outline-none focus:bg-[#B4E4FF] transition-colors"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="font-black uppercase tracking-wider text-xs ml-2">Kilo (kg)</label>
                    <input
                      type="number"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="65"
                      className="w-full bg-gray-50 border-4 border-black text-black font-bold p-3 rounded-xl outline-none focus:bg-[#B4E4FF] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Sağ Taraf: Fotoğraf Yükleme */}
              <div className="space-y-2 flex flex-col h-full">
                <label className="font-black uppercase tracking-wider text-sm ml-2">Referans Fotoğrafın</label>
                
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 min-h-[250px] border-4 border-black border-dashed rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-gray-50 ${previewUrl ? 'bg-gray-100 border-solid p-2' : 'bg-white'}`}
                >
                  {previewUrl ? (
                    <div className="relative w-full h-full rounded-xl overflow-hidden border-4 border-black">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                          <UploadCloud size={20} /> Değiştir
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-[#B4E4FF] border-4 border-black rounded-full flex items-center justify-center mx-auto">
                        <UploadCloud size={32} className="text-black" />
                      </div>
                      <div>
                        <p className="font-black uppercase text-lg">Fotoğraf Yükle</p>
                        <p className="font-bold text-black/50 text-sm">veya buraya sürükle</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-lg p-4 border-4 border-black rounded-xl shadow-[6px_6px_0px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      <span>İkizin Yaratılıyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Stüdyoya Geç</span>
                      <Sparkles size={24} />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}