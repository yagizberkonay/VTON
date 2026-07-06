"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateVTON, generate3DModel } from "@/lib/ai-pipeline";
import { 
  Shirt, Settings, LogOut, Wand2, UploadCloud, Menu, X, Trash2, 
  Save, Sparkles, MessageSquare, ExternalLink, Tag, Search, 
  ShoppingBag, Info, Box 
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";

// --- 3D MODEL GÖRÜNTÜLEYİCİ BİLEŞENİ ---
function ModelViewer({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function AppShell() {
  const router = useRouter();
  
  // -- GENEL STATELER --
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("studio");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // -- STÜDYO STATELERİ --
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [result3DModel, setResult3DModel] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [scrapedInfo, setScrapedInfo] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState<"idle" | "2d" | "3d">("idle");
  const isProcessingRef = useRef(false);

  // -- GARDIROP STATELERİ --
  const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [savingDiscount, setSavingDiscount] = useState(false);

  // -- AYARLAR STATELERİ --
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/onboarding"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profile) {
        setUserProfile({ ...profile, id: session.user.id });
        setEditHeight(profile.height || "");
        setEditWeight(profile.weight || "");
      } else {
        setUserProfile({ id: session.user.id, avatar_url: null, height: "", weight: "" });
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => { 
    if (activeTab === "wardrobe" && userProfile?.id) fetchWardrobe(); 
  }, [activeTab, userProfile]);

  const fetchWardrobe = async () => {
    setLoadingWardrobe(true);
    const { data } = await supabase.from("wardrobe").select("*").eq("user_id", userProfile.id).order("created_at", { ascending: false });
    if (data) setWardrobeItems(data);
    setLoadingWardrobe(false);
  };

  const handleGarmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setGarmentImage(reader.result as string); setInputUrl(""); setScrapedInfo(null); };
      reader.readAsDataURL(file);
    }
  };

  // --- ZİNCİRLEME SİHİRLİ İŞLEM (2D -> SUPABASE -> 3D) ---
  const handleMagicProcess = async () => {
    if (isProcessingRef.current) return;
    if (!userProfile?.avatar_url) return alert("Profil fotoğrafın eksik!");
    if (!inputUrl && !garmentImage) return alert("Lütfen bir ürün linki yapıştır veya fotoğraf yükle!");
    
    isProcessingRef.current = true;
    setLoadingStep("2d");
    setResultImage(null);
    setResult3DModel(null);

    try {
      let finalGarmentImage = garmentImage;
      let currentScrapedInfo = scrapedInfo;

      if (inputUrl && !garmentImage) {
        const res = await fetch("/api/scraper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: inputUrl }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ürün resmi çekilemedi.");
        
        finalGarmentImage = data.imageUrl;
        setGarmentImage(data.imageUrl);
        const info = { url: inputUrl, name: data.title || "Çekilen Ürün", price: data.price || "Fiyat Belirtilmedi" };
        setScrapedInfo(info);
        currentScrapedInfo = info;
      }

      // 1. 2D ÜRETİM VE ANINDA KAYIT
      const generatedB64Url = await generateVTON(userProfile.avatar_url, finalGarmentImage!, extraDetails);
      setResultImage(generatedB64Url);

      const response = await fetch(generatedB64Url);
      const blob = await response.blob();
      const file = new File([blob], `vton-${Date.now()}.png`, { type: 'image/png' });
      const fileName = `${userProfile.id}-${Date.now()}.png`;
      
      await supabase.storage.from('wardrobe').upload(fileName, file);
      
      // Tripo'nun indirebilmesi için Supabase'den public (açık) linki alıyoruz!
      const { data: publicUrlData } = supabase.storage.from('wardrobe').getPublicUrl(fileName);

      await supabase.from('wardrobe').insert({
        user_id: userProfile.id,
        image_url: publicUrlData.publicUrl,
        source_url: currentScrapedInfo?.url || null,
        product_name: currentScrapedInfo?.name || null,
        product_price: currentScrapedInfo?.price || null
      });

      if (activeTab === "wardrobe") fetchWardrobe();

      // 2. 3D ÜRETİM (Tripo'ya Public URL Gönderiliyor)
      try {
        setLoadingStep("3d");
        const generated3DUrl = await generate3DModel(publicUrlData.publicUrl);
        setResult3DModel(generated3DUrl);
      } catch (threeDError: any) {
        console.warn("3D Üretim Hatası:", threeDError);
        alert(`2D Kombinin gardıroba eklendi! ✨\n\nAncak 3D üretimde bir sorun çıktı: ${threeDError.message}`);
      }

    } catch (error: any) {
      alert(`İşlem Hatası: ${error.message}`);
    } finally {
      setLoadingStep("idle");
      isProcessingRef.current = false;
    }
  };

  const handleDeleteItem = async (itemId: string, imageUrl: string) => {
    if (!confirm("Bu kombini arşivden silmek istediğine emin misin?")) return;
    try {
      const { error: dbError } = await supabase.from("wardrobe").delete().eq("id", itemId);
      if (dbError) throw dbError;
      const fileName = imageUrl.split('/').pop();
      if (fileName) await supabase.storage.from("wardrobe").remove([fileName]);
      setWardrobeItems(wardrobeItems.filter(item => item.id !== itemId));
      setSelectedItem(null);
    } catch (error: any) { alert(error.message); }
  };

  const handleSaveDiscountCode = async () => {
    if (!selectedItem) return;
    setSavingDiscount(true);
    try {
      await supabase.from('wardrobe').update({ discount_code: discountInput }).eq('id', selectedItem.id);
      setSelectedItem({ ...selectedItem, discount_code: discountInput });
      setWardrobeItems(wardrobeItems.map(item => item.id === selectedItem.id ? { ...item, discount_code: discountInput } : item));
      alert("İndirim kodu eklendi!");
    } catch (error) { alert("Hata oluştu."); } finally { setSavingDiscount(false); }
  };

  const handleUpdateProfile = async () => {
    if (!editHeight || !editWeight) return alert("Boş bırakılamaz!");
    setUpdateLoading(true);
    try {
      await supabase.from("profiles").update({ height: editHeight, weight: editWeight }).eq("id", userProfile.id);
      setUserProfile((prev: any) => ({ ...prev, height: editHeight, weight: editWeight }));
      alert("Güncellendi!");
    } catch (error: any) { alert("Hata: " + error.message); } finally { setUpdateLoading(false); }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpdate = async () => {
    if (!editImageFile) return;
    setAvatarLoading(true);
    try {
      const fileExt = editImageFile.name.split('.').pop();
      const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
      await supabase.storage.from('avatars').upload(fileName, editImageFile);
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from("profiles").update({ avatar_url: publicUrlData.publicUrl }).eq("id", userProfile.id);
      setUserProfile((prev: any) => ({ ...prev, avatar_url: publicUrlData.publicUrl }));
      setEditImageFile(null); setEditImagePreview(null);
      alert("Fotoğraf güncellendi!");
    } catch (error: any) { alert("Hata: " + error.message); } finally { setAvatarLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/onboarding"); };

  if (!userProfile) return <div className="min-h-screen flex items-center justify-center font-black text-2xl bg-[#FDFDFD]">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black font-sans flex overflow-hidden selection:bg-[#FFF67E]">
      
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative top-0 left-0 h-full w-80 bg-[#FDFDFD] flex flex-col transition-transform duration-300 z-50 p-6`}>
        <div className="flex-1 flex flex-col border-4 border-black rounded-3xl bg-white shadow-[8px_8px_0px_0_rgba(0,0,0,1)] overflow-hidden relative">
          <div className="p-6 border-b-4 border-black bg-[#FFF67E] flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Hermes.</h1>
              <p className="text-xs font-black uppercase tracking-widest text-black/60 mt-1">Sanal Kabin</p>
            </div>
            <button className="md:hidden" onClick={() => setIsMobileMenuOpen(false)}><X size={28} className="text-black" /></button>
          </div>
          <nav className="flex-1 p-6 space-y-4 bg-gray-50">
            <button onClick={() => { setActiveTab("studio"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-6 py-4 border-4 border-black rounded-2xl font-black uppercase tracking-wide transition-all ${activeTab === "studio" ? "bg-black text-white shadow-[4px_4px_0px_0_rgba(255,255,255,1)] translate-x-2" : "bg-white text-black hover:bg-[#FFF67E] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)]"}`}>
              <div className="flex items-center space-x-3"><Wand2 size={24} /><span>Stüdyo</span></div>
            </button>
            <button onClick={() => { setActiveTab("wardrobe"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-6 py-4 border-4 border-black rounded-2xl font-black uppercase tracking-wide transition-all ${activeTab === "wardrobe" ? "bg-black text-white shadow-[4px_4px_0px_0_rgba(255,255,255,1)] translate-x-2" : "bg-white text-black hover:bg-[#B4E4FF] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)]"}`}>
              <div className="flex items-center space-x-3"><Shirt size={24} /><span>Gardırop</span></div>
            </button>
            <button onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-6 py-4 border-4 border-black rounded-2xl font-black uppercase tracking-wide transition-all ${activeTab === "settings" ? "bg-black text-white shadow-[4px_4px_0px_0_rgba(255,255,255,1)] translate-x-2" : "bg-white text-black hover:bg-[#FFB4B4] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)]"}`}>
              <div className="flex items-center space-x-3"><Settings size={24} /><span>Ayarlar</span></div>
            </button>
          </nav>
          <div className="p-6 border-t-4 border-black bg-white">
            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-4 border-4 border-black rounded-xl font-black uppercase tracking-wide bg-[#FFB4B4] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0_rgba(0,0,0,1)] transition-all"><LogOut size={24} /><span>Çıkış Yap</span></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative py-6 pr-6">
        <header className="hidden md:flex h-24 border-4 border-black rounded-3xl px-8 items-center justify-between bg-white z-10 mb-6 shadow-[8px_8px_0px_0_rgba(0,0,0,1)]">
          <h2 className="text-3xl font-black uppercase tracking-tight">{activeTab === "studio" ? "Yaratım Merkezi" : activeTab === "wardrobe" ? "Gardırop Arşivi" : "Profil Ayarları"}</h2>
          <div className="flex items-center space-x-4">
            <div className="text-right"><p className="text-sm font-black uppercase">Dijital İkiz</p><p className="text-xs font-bold text-black/60">{userProfile.height || "-"}cm • {userProfile.weight || "-"}kg</p></div>
            {userProfile.avatar_url && <img src={userProfile.avatar_url} alt="Avatar" className="w-14 h-14 rounded-xl border-4 border-black object-cover shadow-[4px_4px_0px_0_rgba(0,0,0,1)]" />}
          </div>
        </header>

        <div className="md:hidden flex items-center justify-between border-4 border-black rounded-2xl bg-white p-4 mb-4 shadow-[4px_4px_0px_0_rgba(0,0,0,1)] ml-6">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_0_rgba(0,0,0,1)] bg-[#FFF67E]"><Menu size={24} /></button>
          <h1 className="text-2xl font-black uppercase">Hermes.</h1>
          {userProfile.avatar_url && <img src={userProfile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-lg border-2 border-black object-cover" />}
        </div>

        {/* --- STÜDYO EKRANI (BENTO & 3D) --- */}
        {activeTab === "studio" && (
          <div className="w-full max-w-7xl mx-auto pl-6 md:pl-0 h-full flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
              
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="border-4 border-black rounded-3xl p-8 bg-[#FFF67E] shadow-[8px_8px_0px_0_rgba(0,0,0,1)] flex-1 relative overflow-hidden">
                  <div className="absolute -bottom-10 -right-10 text-black/5 pointer-events-none"><Shirt size={250} /></div>
                  <h3 className="text-2xl font-black mb-6 uppercase tracking-tight relative z-10">1. Kıyafeti Belirle</h3>
                  <div className="space-y-4 relative z-10">
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={20} className="text-black/50" /></div><input type="url" placeholder="E-ticaret linkini yapıştır..." value={inputUrl} onChange={(e) => { setInputUrl(e.target.value); setGarmentImage(null); }} className="w-full bg-white border-4 border-black rounded-2xl pl-12 pr-4 py-4 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-black/10 transition-all placeholder:text-black/40" /></div>
                    <div className="flex items-center justify-center space-x-4 opacity-50"><div className="h-1 bg-black flex-1"></div><span className="text-sm font-black uppercase">VEYA</span><div className="h-1 bg-black flex-1"></div></div>
                    <div className="relative border-4 border-black rounded-2xl h-32 flex flex-col items-center justify-center overflow-hidden bg-white hover:bg-[#B4E4FF] transition-colors group cursor-pointer shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">
                      <input type="file" accept="image/*" onChange={handleGarmentUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {garmentImage && !inputUrl ? (
                        <div className="flex items-center gap-4 p-2 w-full h-full"><img src={garmentImage} alt="Seçilen" className="object-contain h-full w-24 bg-gray-100 rounded-xl border-2 border-black" /><p className="font-black uppercase text-sm text-black">✓ Hazır</p></div>
                      ) : (
                        <div className="text-center"><UploadCloud size={32} className="mx-auto mb-2 text-black" /><p className="font-black uppercase text-sm">Cihazdan Fotoğraf Yükle</p></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-4 border-black rounded-3xl p-6 bg-white shadow-[8px_8px_0px_0_rgba(0,0,0,1)]">
                  <label className="flex items-center gap-2 text-sm font-black uppercase mb-3"><MessageSquare size={18} /> Detay Ekle <span className="text-black/50 text-xs">(İsteğe Bağlı)</span></label>
                  <textarea placeholder="Örn: Kıyafetin rengi kırmızı olsun..." value={extraDetails} onChange={(e) => setExtraDetails(e.target.value)} className="w-full bg-gray-50 border-4 border-black rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:bg-[#B4E4FF] transition-colors resize-none h-24 placeholder:text-black/40" />
                </div>
                <button onClick={handleMagicProcess} disabled={loadingStep !== "idle" || (!inputUrl && !garmentImage)} className="w-full py-6 border-4 border-black rounded-3xl shadow-[8px_8px_0px_0_rgba(0,0,0,1)] bg-indigo-600 text-white text-2xl font-black uppercase tracking-widest hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center space-x-4">
                  {loadingStep !== "idle" ? <><Wand2 size={32} className="animate-spin" /><span>Sihir Gerçekleşiyor...</span></> : <><Box size={32} /><span>3D Metaverse Göster</span></>}
                </button>
              </div>

              <div className="lg:col-span-7 border-4 border-black rounded-3xl p-6 bg-[#B4E4FF] shadow-[8px_8px_0px_0_rgba(0,0,0,1)] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black uppercase tracking-tight">2. Canlı Sonuç</h3>
                  {result3DModel ? (
                    <span className="border-4 border-black bg-green-400 text-black px-4 py-2 rounded-full font-black uppercase text-sm shadow-[4px_4px_0px_0_rgba(0,0,0,1)] flex items-center gap-2"><Box size={16}/> 3D Model Hazır</span>
                  ) : resultImage ? (
                    <span className="border-4 border-black bg-[#FFF67E] px-4 py-2 rounded-full font-black uppercase text-sm shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">✨ 2D Arşive Kaydedildi</span>
                  ) : null}
                </div>
                
                <div className="flex-1 border-4 border-black rounded-2xl bg-white overflow-hidden flex items-center justify-center relative shadow-inner">
                  {result3DModel ? (
                    <div className="w-full h-full cursor-grab active:cursor-grabbing">
                      <Canvas shadows camera={{ position: [0, 0, 4], fov: 50 }}>
                        <ambientLight intensity={1} />
                        <directionalLight position={[10, 10, 10]} intensity={1.5} castShadow />
                        <Stage environment="city" intensity={0.6}><ModelViewer url={result3DModel} /></Stage>
                        <OrbitControls autoRotate autoRotateSpeed={2} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 4} />
                      </Canvas>
                      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none"><p className="bg-black/80 text-white inline-block px-4 py-2 rounded-full font-bold text-sm uppercase tracking-widest shadow-lg">Farenle modeli çevir</p></div>
                    </div>
                  ) : resultImage ? (
                    <div className="w-full h-full relative group">
                      <img src={resultImage} alt="2D Sonuç" className="w-full h-full object-contain bg-gray-50 p-2" />
                      {loadingStep === "3d" && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center border-4 border-indigo-600 m-4 rounded-xl animate-pulse">
                            <Box size={64} className="text-indigo-600 mb-4 animate-bounce" />
                            <h3 className="text-2xl font-black uppercase mb-2">Tripo 3D Model Üretiyor</h3>
                            <p className="font-bold text-black/60">Lütfen bekleyin, bu işlem ortalama 15 saniye sürer...</p>
                         </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center px-8">
                      {loadingStep === "2d" ? (
                        <div className="space-y-6"><div className="w-24 h-24 border-4 border-black bg-[#FFF67E] rounded-full shadow-[4px_4px_0px_0_rgba(0,0,0,1)] flex items-center justify-center mx-auto animate-bounce"><Wand2 size={40} className="text-black animate-pulse" /></div><p className="text-xl font-black uppercase animate-pulse">Kıyafet 2D olarak size giydiriliyor...</p></div>
                      ) : (
                        <div><div className="w-24 h-24 border-4 border-black bg-gray-50 rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] flex items-center justify-center mx-auto mb-6 transform -rotate-6"><Box size={48} className="text-black/20" /></div><p className="text-xl font-black text-black/40 uppercase">3D Metaverse için hazırsın.</p></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- GARDIROP VE POP-UP --- */}
        {activeTab === "wardrobe" && (
          <div className="w-full max-w-7xl mx-auto pl-6 md:pl-0">
            {loadingWardrobe ? (
              <div className="flex justify-center py-20"><Wand2 className="animate-spin w-12 h-12 text-black/20" /></div>
            ) : wardrobeItems.length === 0 ? (
              <div className="text-center py-20 border-4 border-dashed border-black rounded-3xl bg-gray-50"><ShoppingBag size={64} className="mx-auto mb-4 text-black/20" /><h2 className="text-3xl font-black uppercase text-black/40">Gardırobun Boş</h2></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {wardrobeItems.map((item) => (
                  <div key={item.id} onClick={() => { setSelectedItem(item); setDiscountInput(item.discount_code || ""); }} className="border-4 border-black rounded-3xl overflow-hidden bg-white shadow-[6px_6px_0px_0_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[10px_10px_0px_0_rgba(0,0,0,1)] transition-all cursor-pointer group">
                    <div className="aspect-[3/4] relative"><img src={item.image_url} alt="Kombin" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="bg-[#FFF67E] border-4 border-black text-black font-black uppercase px-4 py-2 rounded-xl">Detaylar</span></div></div>
                    {item.product_name && <div className="p-3 border-t-4 border-black bg-white"><p className="font-black uppercase text-xs truncate">{item.product_name}</p></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}>
            <div className="bg-white border-4 border-black rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[16px_16px_0px_0_rgba(0,0,0,1)] flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
              <div className="w-full md:w-1/2 bg-gray-50 border-b-4 md:border-b-0 md:border-r-4 border-black flex items-center justify-center p-4 relative">
                <img src={selectedItem.image_url} alt="Seçili Kombin" className="max-h-full object-contain rounded-xl border-4 border-black shadow-[4px_4px_0px_0_rgba(0,0,0,1)]" />
                <button onClick={() => handleDeleteItem(selectedItem.id, selectedItem.image_url)} className="absolute top-6 left-6 bg-[#FFB4B4] border-4 border-black p-3 rounded-xl hover:bg-red-500 hover:text-white transition-colors shadow-[4px_4px_0px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none"><Trash2 size={24} /></button>
              </div>
              <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto bg-white relative">
                <button onClick={() => setSelectedItem(null)} className="absolute top-6 right-6 text-black hover:text-red-500 transition-colors"><X size={32} /></button>
                <h3 className="text-3xl font-black uppercase mb-8 pr-12">Kombin Detayları</h3>
                {selectedItem.source_url ? (
                  <div className="space-y-6 flex-1">
                    <div className="border-4 border-black rounded-2xl p-6 bg-[#B4E4FF] shadow-[4px_4px_0px_0_rgba(0,0,0,1)]"><p className="text-sm font-bold uppercase text-black/60 mb-1">Ürün Adı</p><p className="text-xl font-black uppercase mb-4">{selectedItem.product_name}</p><p className="text-sm font-bold uppercase text-black/60 mb-1">Fiyat</p><p className="text-2xl font-black text-indigo-700">{selectedItem.product_price}</p></div>
                    <a href={selectedItem.source_url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center space-x-3 bg-[#FFF67E] border-4 border-black text-black font-black uppercase px-6 py-4 rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0_rgba(0,0,0,1)] transition-all"><span>Mağazaya Git</span><ExternalLink size={20} /></a>
                    <div className="border-4 border-black rounded-2xl p-6 bg-gray-50 border-dashed"><label className="flex items-center gap-2 text-sm font-black uppercase mb-3"><Tag size={18} /> İndirim Kodu Ekle</label><div className="flex gap-2"><input type="text" placeholder="Örn: YAZ10" value={discountInput} onChange={(e) => setDiscountInput(e.target.value.toUpperCase())} className="flex-1 bg-white border-4 border-black rounded-xl px-4 py-3 font-black focus:outline-none focus:bg-[#FFF67E] transition-colors uppercase" /><button onClick={handleSaveDiscountCode} disabled={savingDiscount || discountInput === (selectedItem.discount_code || "")} className="bg-black text-white px-6 border-4 border-black rounded-xl font-black uppercase hover:bg-gray-800 disabled:opacity-50 transition-colors">{savingDiscount ? "..." : "Kaydet"}</button></div>{selectedItem.discount_code && <p className="mt-3 text-sm font-bold text-green-600">Aktif Kod: <span className="bg-green-100 text-black px-2 py-1 rounded border-2 border-black ml-1">{selectedItem.discount_code}</span></p>}</div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-4"><ShoppingBag size={48} /><p className="font-black uppercase text-lg">Manuel oluşturulmuş.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- AYARLAR --- */}
        {activeTab === "settings" && (
          <div className="w-full max-w-4xl mx-auto pl-6 md:pl-0 space-y-8 pb-10">
            <div className="border-4 border-black rounded-3xl p-8 bg-white shadow-[8px_8px_0px_0_rgba(0,0,0,1)]">
              <h2 className="text-3xl font-black uppercase mb-8 border-b-4 border-black pb-4">Fiziksel Ölçüler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div><label className="block text-sm font-bold uppercase mb-3">Boyun (CM)</label><input type="number" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="w-full bg-gray-50 border-4 border-black rounded-2xl px-4 py-4 text-2xl font-black focus:outline-none focus:bg-[#FFF67E] transition-colors" /></div>
                <div><label className="block text-sm font-bold uppercase mb-3">Kilon (KG)</label><input type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-full bg-gray-50 border-4 border-black rounded-2xl px-4 py-4 text-2xl font-black focus:outline-none focus:bg-[#FFF67E] transition-colors" /></div>
              </div>
              <button onClick={handleUpdateProfile} disabled={updateLoading || (editHeight == userProfile.height && editWeight == userProfile.weight)} className="w-full py-5 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0_rgba(0,0,0,1)] bg-[#B4E4FF] text-black text-xl font-black uppercase hover:-translate-y-1 hover:shadow-[6px_6px_0px_0_rgba(0,0,0,1)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"><Save size={24} /> <span>{updateLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span></button>
            </div>
            <div className="border-4 border-black rounded-3xl p-8 bg-[#FFB4B4] shadow-[8px_8px_0px_0_rgba(0,0,0,1)]">
              <h3 className="text-3xl font-black uppercase mb-6 border-b-4 border-black pb-4">Dijital İkizi Değiştir</h3>
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-stretch">
                <div className="flex-1 space-y-6 w-full">
                  <div className="bg-[#FFF67E] border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0_rgba(0,0,0,1)] h-full flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-3"><Info size={24} className="text-black" /><h4 className="font-black uppercase tracking-wider text-lg">Mükemmel Sonuç İçin</h4></div>
                    <ul className="text-sm md:text-base font-bold text-black/80 space-y-3"><li>• Kamera Açısı: Tam karşıdan bak ve dik dur.</li><li>• Işık: Yüzün aydınlık ve gölgesiz olmalı.</li><li>• İfade: Nötr bir yüz ifadesi kullan. Mimik yapmamaya çalış.</li></ul>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 w-full">
                  <div className="relative border-4 border-black rounded-3xl w-56 h-56 flex-shrink-0 flex flex-col items-center justify-center overflow-hidden bg-white cursor-pointer hover:bg-gray-50 transition-colors group shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">
                    <input type="file" accept="image/*" onChange={handleAvatarSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {editImagePreview ? <img src={editImagePreview} alt="Yeni Avatar" className="object-cover w-full h-full" /> : userProfile.avatar_url ? <img src={userProfile.avatar_url} alt="Mevcut Avatar" className="object-cover w-full h-full group-hover:opacity-40 transition-opacity" /> : <div className="w-full h-full bg-gray-200"></div>}
                    {!editImagePreview && <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm"><UploadCloud size={40} className="text-black mb-2" /><span className="font-black uppercase text-sm">Fotoğraf Seç</span></div>}
                  </div>
                  {editImagePreview && <button onClick={handleAvatarUpdate} disabled={avatarLoading} className="w-full max-w-[14rem] px-6 py-4 border-4 border-black rounded-2xl bg-black text-white font-black uppercase shadow-md">{avatarLoading ? "Güncelleniyor..." : "Yeni İkizi Kaydet"}</button>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}