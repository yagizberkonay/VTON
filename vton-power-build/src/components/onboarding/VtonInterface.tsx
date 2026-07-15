"use client"; // Eğer Next.js App Router kullanıyorsan bu satır zorunludur

import React, { useState } from "react";
import { generateVTON, generate3DModel, getStylistFeedback, StylistFeedback } from "@/lib/ai-pipeline";

export default function VtonInterface() {
  // Sistem Durumları (States)
  const [personImage, setPersonImage] = useState<string>("https://ornek-kullanici-resmi.jpg");
  const [garmentImage, setGarmentImage] = useState<string>("https://ornek-kiyafet.jpg");
  
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [objModelUrl, setObjModelUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<StylistFeedback | null>(null);
  
  // Yükleme Durumları
  const [is2DLoading, setIs2DLoading] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [is3DLoading, setIs3DLoading] = useState(false);
  
  // Görünüm Modu: '2D' veya '3D'
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");

  // 1. ADIM: 2D VTON ÜRETİMİ VE GEMINI TETİKLEMESİ
  const handleGenerate2D = async () => {
    setIs2DLoading(true);
    setResultImage(null);
    setFeedback(null);
    setObjModelUrl(null);
    setViewMode("2D");

    try {
      // 2D Sanal deneme başlar
      const vtonResult = await generateVTON(personImage, garmentImage);
      setResultImage(vtonResult);
      setIs2DLoading(false);

      // 2D biter bitmez kullanıcıyı bekletmeden arka planda Gemini Stilistini çağırırız
      setIsFeedbackLoading(true);
      const stylistData = await getStylistFeedback(vtonResult);
      setFeedback(stylistData);
    } catch (error: any) {
      alert("Hata oluştu: " + error.message);
    } finally {
      setIs2DLoading(false);
      setIsFeedbackLoading(false);
    }
  };

  // 2. ADIM: İSTEĞE BAĞLI 3D MODEL ÜRETİMİ
  const handleGenerate3D = async () => {
    if (!resultImage) return;
    setIs3DLoading(true);
    
    try {
      // Modal'daki PIFuHD motorunu tetikliyoruz
      const modelUrl = await generate3DModel(resultImage);
      setObjModelUrl(modelUrl);
      setViewMode("3D"); // Üretim bitince otomatik 3D moduna geç
    } catch (error: any) {
      alert("3D Üretim Hatası: " + error.message);
    } finally {
      setIs3DLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* ÜST BÖLÜM: BAŞLATMA BUTONU */}
      <div className="flex justify-center mb-8">
        <button 
          onClick={handleGenerate2D}
          disabled={is2DLoading}
          className="px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-all"
        >
          {is2DLoading ? "Kıyafet Giyiliyor..." : "Sanal Denemeyi Başlat (2D)"}
        </button>
      </div>

      {/* ALT BÖLÜM: SONUÇLAR VE STİLİST */}
      {resultImage && (
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* SOL PANEL: GÖRSEL / 3D GEÇİŞİ */}
          <div className="flex-1 bg-white p-4 rounded-2xl shadow-lg flex flex-col items-center">
            
            {/* 2D / 3D Toggle Butonları */}
            {objModelUrl && (
              <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode("2D")}
                  className={`px-4 py-1 rounded-md text-sm font-semibold ${viewMode === "2D" ? "bg-white shadow" : "text-gray-500"}`}
                >
                  2D Görünüm
                </button>
                <button 
                  onClick={() => setViewMode("3D")}
                  className={`px-4 py-1 rounded-md text-sm font-semibold ${viewMode === "3D" ? "bg-white shadow" : "text-gray-500"}`}
                >
                  3D İskelet
                </button>
              </div>
            )}

            {/* İçerik Ekranı */}
            <div className="w-full aspect-[3/4] bg-gray-200 rounded-xl overflow-hidden relative flex items-center justify-center">
              {viewMode === "2D" ? (
                <img src={resultImage} alt="VTON Result" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <p className="text-gray-600 font-medium mb-4">3D Anatomik Model (.obj) Hazır!</p>
                  <a 
                    href={objModelUrl!} 
                    download="anatomik_iskelet.obj"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Modeli İndir
                  </a>
                  <p className="text-xs text-gray-400 mt-4">Not: Tarayıcıda 3D göstermek için Three.js gereklidir.</p>
                </div>
              )}
            </div>

            {/* 3D Üretim Butonu (Sadece 2D modundayken ve henüz 3D üretilmediyse göster) */}
            {viewMode === "2D" && !objModelUrl && (
              <button 
                onClick={handleGenerate3D}
                disabled={is3DLoading}
                className="mt-4 px-6 py-2 border-2 border-black text-black rounded-full font-bold hover:bg-black hover:text-white transition-all w-full"
              >
                {is3DLoading ? "Anatomi Çıkartılıyor..." : "✨ 3D Silüetini Gör (Bekleme: ~20sn)"}
              </button>
            )}
          </div>

          {/* SAĞ PANEL: GEMINI STİL DANIŞMANI */}
          <div className="flex-1">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl h-full">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span>🪄</span> Yapay Zeka Stilisti
              </h3>
              
              {isFeedbackLoading ? (
                <div className="animate-pulse flex flex-col gap-4">
                  <div className="h-4 bg-white/20 rounded w-3/4"></div>
                  <div className="h-4 bg-white/20 rounded w-full"></div>
                  <div className="h-4 bg-white/20 rounded w-5/6"></div>
                </div>
              ) : feedback ? (
                <div className="space-y-6">
                  {/* Uyum Yüzdesi */}
                  <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                    <p className="text-sm text-purple-200 uppercase tracking-wider font-semibold mb-1">Kalıp Uyumu</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-green-400">%{feedback.fit_percentage}</span>
                      <span className="text-sm mb-1 opacity-80">oranında oturdu</span>
                    </div>
                  </div>

                  {/* Analiz */}
                  <div>
                    <p className="text-sm text-purple-200 uppercase tracking-wider font-semibold mb-1">Acımasız Analiz</p>
                    <p className="text-sm leading-relaxed text-gray-100">{feedback.analysis}</p>
                  </div>

                  {/* Öneri */}
                  <div className="bg-purple-800/50 p-4 rounded-xl border border-purple-500/30">
                    <p className="text-sm text-purple-200 uppercase tracking-wider font-semibold mb-1">Stilistin Önerisi</p>
                    <p className="text-sm leading-relaxed text-purple-50">{feedback.recommendation}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/50 italic">Stilist raporu bekleniyor...</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}