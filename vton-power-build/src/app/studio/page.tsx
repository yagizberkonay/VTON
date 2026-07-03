"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateVTON } from "@/lib/ai-pipeline";
import { LayoutDashboard, Shirt, Settings, LogOut, Wand2, Link as LinkIcon, UploadCloud, Menu, X, Trash2, Save } from "lucide-react";

export default function AppShell() {
  const router = useRouter();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  
  const [activeTab, setActiveTab] = useState("studio");
  const [scraperUrl, setScraperUrl] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Gardırop State'i
  const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);

  // Ayarlar State'i
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Yeni Avatar State'i
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/onboarding");
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
        
      setUserProfile({ ...profile, id: session.user.id });
      setEditHeight(profile.height);
      setEditWeight(profile.weight);
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (activeTab === "wardrobe" && userProfile?.id) {
      fetchWardrobe();
    }
  }, [activeTab, userProfile]);

  const fetchWardrobe = async () => {
    setLoadingWardrobe(true);
    const { data } = await supabase
      .from("wardrobe")
      .select("*")
      .eq("user_id", userProfile.id)
      .order("created_at", { ascending: false });
      
    if (data) setWardrobeItems(data);
    setLoadingWardrobe(false);
  };

  const handleGarmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setGarmentImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleScrape = async () => {
    if (!scraperUrl) return alert("Lütfen bir ürün linki yapıştırın.");
    setIsScraping(true);
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scraperUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGarmentImage(data.imageUrl);
      setScraperUrl("");
    } catch (error: any) {
      alert(`Scraper Hatası: ${error.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerate = async () => {
    if (!userProfile?.avatar_url || !garmentImage) return alert("Kıyafet seçmelisin!");
    
    setLoading(true);
    try {
      const generatedB64Url = await generateVTON(userProfile.avatar_url, garmentImage);
      setResultImage(generatedB64Url);

      const response = await fetch(generatedB64Url);
      const blob = await response.blob();
      const file = new File([blob], `vton-${Date.now()}.png`, { type: 'image/png' });

      const fileName = `${userProfile.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('wardrobe').upload(fileName, file);

      if (uploadError) throw new Error(`Buluta yüklenemedi: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from('wardrobe').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('wardrobe').insert({
        user_id: userProfile.id,
        image_url: publicUrlData.publicUrl
      });

      if (dbError) throw new Error(`Veritabanı hatası: ${dbError.message}`);

      if (activeTab === "wardrobe") fetchWardrobe(); 

    } catch (error: any) {
      alert(`İşlem Hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string, imageUrl: string) => {
    if (!confirm("Bu kombini arşiven silmek istediğine emin misin?")) return;
    
    try {
      await supabase.from("wardrobe").delete().eq("id", itemId);
      
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from("wardrobe").remove([fileName]);
      }

      setWardrobeItems(wardrobeItems.filter(item => item.id !== itemId));
    } catch (error: any) {
      alert("Silinirken hata oluştu.");
    }
  };

  const handleUpdateProfile = async () => {
    if (!editHeight || !editWeight) return alert("Boy ve kilo boş bırakılamaz!");
    setUpdateLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ height: editHeight, weight: editWeight })
        .eq("id", userProfile.id);
        
      if (error) throw error;
      
      setUserProfile((prev: any) => ({ ...prev, height: editHeight, weight: editWeight }));
      alert("Ölçülerin başarıyla güncellendi!");
    } catch (error: any) {
      alert("Güncelleme Hatası: " + error.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Yeni Dijital İkiz (Avatar) Seçimi
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Yeni Avatarı Buluta Yükleme ve Veritabanını Güncelleme
  const handleAvatarUpdate = async () => {
    if (!editImageFile) return;
    setAvatarLoading(true);
    try {
      // 1. Yeni fotoğrafı 'avatars' deposuna yükle (Mevcut olanla çakışmaması için Date.now() kullanıyoruz)
      const fileExt = editImageFile.name.split('.').pop();
      const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, editImageFile);
      if (uploadError) throw uploadError;

      // 2. Herkese açık URL'yi al
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = publicUrlData.publicUrl;

      // 3. Profiles tablosunda avatar_url bilgisini güncelle
      const { error: dbError } = await supabase.from("profiles").update({ avatar_url: newAvatarUrl }).eq("id", userProfile.id);
      if (dbError) throw dbError;

      // 4. Arayüzü Anında Güncelle
      setUserProfile((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
      setEditImageFile(null);
      setEditImagePreview(null);
      
      alert("Dijital ikiz fotoğrafın başarıyla güncellendi!");
    } catch (error: any) {
      alert("Fotoğraf Güncelleme Hatası: " + error.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/onboarding");
  };

  if (!userProfile) return <div className="min-h-screen flex items-center justify-center font-black text-2xl bg-[#FDFDFD]">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black font-sans flex overflow-hidden">
      
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative top-0 left-0 h-full w-72 border-r-4 border-black bg-[#FFF67E] flex flex-col transition-transform duration-300 z-50`}>
        <div className="p-6 border-b-4 border-black flex justify-between items-center bg-white">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Hermes.</h1>
            <p className="text-sm font-bold text-black/60 mt-1">AI VTON STUDIO</p>
          </div>
          <button className="md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={28} className="text-black" />
          </button>
        </div>
        
        <nav className="flex-1 p-6 space-y-4 bg-[#FFF67E]">
          <button onClick={() => { setActiveTab("studio"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-4 border-4 border-black rounded-xl font-black uppercase tracking-wide transition-all ${activeTab === "studio" ? "bg-black text-white shadow-[4px_4px_0px_0_rgba(255,255,255,1)]" : "bg-white text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)]"}`}>
            <Wand2 size={24} /><span>Stüdyo</span>
          </button>
          
          <button onClick={() => { setActiveTab("wardrobe"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-4 border-4 border-black rounded-xl font-black uppercase tracking-wide transition-all ${activeTab === "wardrobe" ? "bg-black text-white shadow-[4px_4px_0px_0_rgba(255,255,255,1)]" : "bg-white text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)]"}`}>
            <Shirt size={24} /><span>Gardırop</span>
          </button>

          <button onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-4 border-4 border-black rounded-xl font-black uppercase tracking-wide transition-all ${activeTab === "settings" ? "bg-black text-white shadow-[4px_4px_0px_0_rgba(255,255,255,1)]" : "bg-white text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)]"}`}>
            <Settings size={24} /><span>Ayarlar</span>
          </button>
        </nav>

        <div className="p-6 border-t-4 border-black bg-white">
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-4 border-4 border-black rounded-xl font-black uppercase tracking-wide bg-[#FFB4B4] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)] transition-all">
            <LogOut size={24} /><span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        
        <div className="md:hidden flex items-center justify-between border-b-4 border-black bg-white p-4 sticky top-0 z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_0_rgba(0,0,0,1)] bg-[#FFF67E]"><Menu size={24} /></button>
          <h1 className="text-2xl font-black uppercase">Hermes.</h1>
          <img src={userProfile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
        </div>

        <header className="hidden md:flex h-24 border-b-4 border-black px-8 items-center justify-between bg-white z-10 sticky top-0">
          <h2 className="text-3xl font-black uppercase tracking-tight">
            {activeTab === "studio" ? "Yapay Zeka Stüdyosu" : activeTab === "wardrobe" ? "Gardırop Arşivi" : "Profil Ayarları"}
          </h2>
          <div className="flex items-center space-x-4 border-4 border-black rounded-xl p-2 bg-[#B4E4FF] shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">
            <div className="text-right">
              <p className="text-sm font-black uppercase">Dijital İkiz</p>
              <p className="text-xs font-bold text-black/60">{userProfile.height}cm • {userProfile.weight}kg</p>
            </div>
            <img src={userProfile.avatar_url} alt="Avatar" className="w-12 h-12 rounded-lg border-2 border-black object-cover" />
          </div>
        </header>

        {/* --- STÜDYO --- */}
        {activeTab === "studio" && (
          <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-8 flex flex-col">
                <div className="border-4 border-black rounded-2xl p-6 bg-white shadow-[6px_6px_0px_0_rgba(0,0,0,1)] flex flex-col">
                  <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">1. Kıyafet Seçimi</h3>
                  <div className="mb-6">
                    <label className="block text-sm font-bold uppercase mb-2">Ürün Linki (Trendyol vs.)</label>
                    <div className="flex space-x-2">
                      <input type="url" placeholder="Link yapıştır..." value={scraperUrl} onChange={(e) => setScraperUrl(e.target.value)} className="flex-1 bg-gray-50 border-4 border-black rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:bg-[#FFF67E] transition-colors" />
                      <button onClick={handleScrape} disabled={isScraping || !scraperUrl} className="border-4 border-black bg-[#FFB4B4] rounded-xl px-6 py-3 font-black uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)] transition-all disabled:opacity-50">
                        {isScraping ? "..." : "ÇEK"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-4 mb-6">
                    <div className="h-1 bg-black flex-1"></div><span className="text-xl font-black uppercase">VEYA</span><div className="h-1 bg-black flex-1"></div>
                  </div>
                  <div className="relative border-4 border-dashed border-black rounded-xl h-48 flex flex-col items-center justify-center overflow-hidden bg-gray-50 hover:bg-[#B4E4FF] transition-colors group cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleGarmentUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {garmentImage ? <img src={garmentImage} alt="Kıyafet" className="object-contain w-full h-full p-2 bg-white" /> : <div className="text-center transition-transform group-hover:scale-110"><UploadCloud size={48} className="mx-auto mb-2 text-black" /><p className="font-black uppercase text-lg">Fotoğraf Yükle</p></div>}
                  </div>
                </div>
                <button onClick={handleGenerate} disabled={loading || !garmentImage} className="w-full py-6 border-4 border-black rounded-2xl shadow-[8px_8px_0px_0_rgba(0,0,0,1)] bg-indigo-600 text-white text-2xl font-black uppercase tracking-widest hover:bg-indigo-700 hover:translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)] transition-all disabled:opacity-50 flex items-center justify-center space-x-4">
                  {loading ? <><Wand2 size={32} className="animate-spin" /><span>Dikiliyor...</span></> : <><Wand2 size={32} /><span>Üzerimde Dene</span></>}
                </button>
              </div>
              <div className="lg:col-span-7 border-4 border-black rounded-2xl p-6 bg-[#B4E4FF] shadow-[8px_8px_0px_0_rgba(0,0,0,1)] flex flex-col min-h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black uppercase tracking-tight">2. Canlı Sonuç</h3>
                  {resultImage && <span className="border-4 border-black bg-[#FFF67E] px-4 py-1 rounded-full font-black uppercase text-sm shadow-[2px_2px_0px_0_rgba(0,0,0,1)]">Arşive Kaydedildi</span>}
                </div>
                <div className="flex-1 border-4 border-black rounded-xl bg-white overflow-hidden flex items-center justify-center relative shadow-inner">
                  {resultImage ? <img src={resultImage} alt="Sonuç" className="w-full h-full object-cover" /> : <div className="text-center px-8"><div className="w-24 h-24 border-4 border-black bg-gray-50 rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] flex items-center justify-center mx-auto mb-6 transform -rotate-6"><Shirt size={48} className="text-black/30" /></div><p className="text-xl font-black text-black/50 uppercase">Kıyafet seçimi bekleniyor.<br/><span className="text-sm tracking-wide mt-2 block">Yüz kimliğiniz otomatik korunacaktır.</span></p></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- GARDIROP --- */}
        {activeTab === "wardrobe" && (
          <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
            {loadingWardrobe ? (
              <div className="flex justify-center py-20"><Wand2 className="animate-spin w-12 h-12 text-black/20" /></div>
            ) : wardrobeItems.length === 0 ? (
              <div className="text-center py-20 border-4 border-dashed border-black/20 rounded-3xl">
                <Shirt size={64} className="mx-auto mb-4 text-black/20" />
                <h2 className="text-3xl font-black uppercase text-black/40">Gardırobun Henüz Boş</h2>
                <p className="font-bold text-black/40 mt-2">Stüdyoya git ve ilk kombinini yarat!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {wardrobeItems.map((item) => (
                  <div key={item.id} className="border-4 border-black rounded-2xl overflow-hidden bg-white shadow-[6px_6px_0px_0_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[8px_8px_0px_0_rgba(0,0,0,1)] transition-all group relative">
                    <img src={item.image_url} alt="Kombin" className="w-full aspect-[3/4] object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-4 p-4">
                      <a href={item.image_url} target="_blank" rel="noreferrer" className="w-full text-center bg-[#FFF67E] border-4 border-black text-black font-black uppercase px-6 py-3 rounded-xl hover:bg-white transition-colors">
                        Büyüt
                      </a>
                      <button onClick={() => handleDeleteItem(item.id, item.image_url)} className="w-full flex items-center justify-center space-x-2 bg-[#FFB4B4] border-4 border-black text-black font-black uppercase px-6 py-3 rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 size={20} /> <span>Sil</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- AYARLAR --- */}
        {activeTab === "settings" && (
          <div className="p-4 md:p-8 w-full max-w-3xl mx-auto space-y-8">
            
            {/* Boy ve Kilo Kutusu */}
            <div className="border-4 border-black rounded-2xl p-8 bg-white shadow-[8px_8px_0px_0_rgba(0,0,0,1)]">
              <h2 className="text-3xl font-black uppercase mb-8 border-b-4 border-black pb-4">Fiziksel Ölçüler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-bold uppercase mb-3">Boyun (CM)</label>
                  <input type="number" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="w-full bg-gray-50 border-4 border-black rounded-xl px-4 py-4 text-2xl font-black focus:outline-none focus:bg-[#FFF67E] transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-3">Kilon (KG)</label>
                  <input type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-full bg-gray-50 border-4 border-black rounded-xl px-4 py-4 text-2xl font-black focus:outline-none focus:bg-[#FFF67E] transition-colors" />
                </div>
              </div>
              <button onClick={handleUpdateProfile} disabled={updateLoading || (editHeight == userProfile.height && editWeight == userProfile.weight)} className="w-full py-5 border-4 border-black rounded-xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] bg-[#B4E4FF] text-black text-xl font-black uppercase hover:bg-[#82CFFF] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center space-x-2">
                <Save size={24} /> <span>{updateLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span>
              </button>
            </div>
            
            {/* Dijital İkiz (Avatar) Değiştirme Kutusu */}
            <div className="border-4 border-black rounded-2xl p-8 bg-[#FFB4B4] shadow-[8px_8px_0px_0_rgba(0,0,0,1)]">
               <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-4">Dijital İkizi Değiştir</h3>
               
               <div className="flex flex-col md:flex-row items-center gap-8">
                 
                 {/* Fotoğraf Seçme Alanı */}
                 <div className="relative border-4 border-black rounded-xl w-40 h-40 flex-shrink-0 flex flex-col items-center justify-center overflow-hidden bg-white cursor-pointer hover:bg-gray-50 transition-colors group">
                   <input type="file" accept="image/*" onChange={handleAvatarSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                   
                   {editImagePreview ? (
                     <img src={editImagePreview} alt="Yeni Avatar" className="object-cover w-full h-full" />
                   ) : (
                     <img src={userProfile.avatar_url} alt="Mevcut Avatar" className="object-cover w-full h-full group-hover:opacity-40 transition-opacity" />
                   )}
                   
                   {!editImagePreview && (
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <UploadCloud size={32} className="text-black" />
                     </div>
                   )}
                 </div>

                 {/* Bilgi ve Kaydet Butonu */}
                 <div className="flex-1 w-full space-y-4 text-center md:text-left">
                   <p className="font-bold text-black/70">Yüz hatlarının net belli olduğu, kollarının açık olduğu iyi aydınlatılmış yeni bir fotoğraf seç.</p>
                   
                   {editImagePreview && (
                     <button 
                       onClick={handleAvatarUpdate} 
                       disabled={avatarLoading}
                       className="w-full md:w-auto px-8 py-4 border-4 border-black rounded-xl bg-black text-white font-black uppercase shadow-[4px_4px_0px_0_rgba(255,255,255,0.5)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0_rgba(255,255,255,0.8)] transition-all disabled:opacity-50"
                     >
                       {avatarLoading ? "Güncelleniyor..." : "Yeni Fotoğrafı Kaydet"}
                     </button>
                   )}
                 </div>

               </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}