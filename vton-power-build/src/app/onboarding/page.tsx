"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  
  // State (Hafıza) Yönetimi
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Fotoğraf Seçimi
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file); // Supabase'e yüklenecek fiziksel dosya
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string); // Ekranda göstermek için
      reader.readAsDataURL(file);
    }
  };

  // Sisteme Kayıt İşlemi
  const handleSave = async () => {
    if (!imageFile || !height || !weight || !email || !password) {
      alert("Lütfen dijital ikizini oluşturmak için tüm alanları doldur!");
      return;
    }

    setLoading(true);

    try {
      // 1. SUPABASE AUTH: Kullanıcıyı Sisteme Kaydet
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      
      const userId = authData.user?.id;
      if (!userId) throw new Error("Kullanıcı oluşturulamadı.");

      // 2. SUPABASE STORAGE: Fotoğrafı 'avatars' kovasına yükle
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Yüklenen fotoğrafın herkese açık (Public) URL'ini al
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 3. SUPABASE DATABASE: Kullanıcı profilini ve ölçülerini kaydet
      const { error: dbError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          avatar_url: publicUrlData.publicUrl,
          height: parseFloat(height),
          weight: parseFloat(weight)
        });

      if (dbError) throw dbError;

      // Her şey başarılıysa ana sayfaya uçur
      router.push("/studio");

    } catch (error: any) {
      console.error("Kayıt Hatası:", error);
      alert(`Bir hata oluştu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black font-sans flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sol Taraf: Karşılama */}
        <div className="flex flex-col justify-center space-y-6">
          <h1 className="text-5xl font-black uppercase tracking-tight">
            Dijital İkizini <br /> <span className="text-indigo-600">Yarat.</span>
          </h1>
          <p className="text-lg font-medium text-gray-600">
            Kıyafetlerin üzerinde nasıl duracağını görmek için sadece bir kez fiziksel özelliklerini sisteme tanımlaman yeterli. Artık hesap da oluşturuyorsun!
          </p>
        </div>

        {/* Sağ Taraf: Neo-Brutalism Form */}
        <div className="space-y-6">
          
          {/* Fotoğraf Kutusu */}
          <div className="border-4 border-black rounded-2xl shadow-[6px_6px_0px_0_rgba(0,0,0,1)] bg-white p-6 transition-transform hover:-translate-y-1 hover:shadow-[8px_8px_0px_0_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold mb-4">1. Fotoğrafını Yükle</h2>
            <div className="relative border-2 border-dashed border-gray-300 rounded-xl h-48 flex flex-col items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:bg-gray-100">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              {imagePreview ? (
                <img src={imagePreview} alt="Dijital İkiz" className="object-cover w-full h-full" />
              ) : (
                <div className="text-center">
                  <span className="text-3xl">📸</span>
                  <p className="mt-2 font-semibold text-gray-500">Tıkla ve Yükle</p>
                </div>
              )}
            </div>
          </div>

         {/* Hesap Bilgileri (Email & Şifre) - Dev Boyut ve Tam Genişlik */}
          <div className="space-y-4">
            <div className="border-4 border-black rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] bg-[#FFB4B4] p-6">
              <label className="block text-sm font-bold uppercase mb-2 text-black/80">E-Posta Adresin</label>
              <input 
                type="email" 
                placeholder="ornek@mail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b-4 border-black focus:outline-none text-2xl md:text-3xl font-black placeholder-black/30 py-2"
              />
            </div>
            
            <div className="border-4 border-black rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] bg-[#FFB4B4] p-6">
              <label className="block text-sm font-bold uppercase mb-2 text-black/80">Sisteme Giriş Şifren</label>
              <input 
                type="password" 
                placeholder="******" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-4 border-black focus:outline-none text-2xl md:text-3xl font-black placeholder-black/30 py-2 tracking-widest"
              />
            </div>
          </div>

          {/* Ölçü Kutuları */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-4 border-black rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] bg-[#FFF67E] p-6">
              <label className="block text-sm font-bold uppercase mb-2">Boy (CM)</label>
              <input 
                type="number" 
                placeholder="180" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black focus:outline-none text-2xl font-black placeholder-gray-600"
              />
            </div>
            <div className="border-4 border-black rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] bg-[#B4E4FF] p-6">
              <label className="block text-sm font-bold uppercase mb-2">Kilo (KG)</label>
              <input 
                type="number" 
                placeholder="75" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black focus:outline-none text-2xl font-black placeholder-gray-600"
              />
            </div>
          </div>

          {/* Kaydet Butonu */}
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0_rgba(0,0,0,1)] bg-indigo-600 text-white text-xl font-black uppercase tracking-widest hover:bg-indigo-700 hover:shadow-[2px_2px_0px_0_rgba(0,0,0,1)] hover:translate-y-1 transition-all disabled:opacity-50"
          >
            {loading ? "Sisteme Kaydediliyor..." : "Sisteme Kaydet & Başla"}
          </button>
        </div>

      </div>
    </div>
  );
}