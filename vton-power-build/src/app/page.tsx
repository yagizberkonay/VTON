import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Zap, Shirt } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black font-sans overflow-x-hidden selection:bg-[#FFF67E]">
      

      <header className="h-24 border-b-4 border-black px-6 md:px-12 flex items-center justify-between bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase">Hermes.</h1>
        </div>
        <nav className="hidden md:flex space-x-8">
          <a href="#ozellikler" className="font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors">Özellikler</a>
          <a href="#nasil-calisir" className="font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors">Nasıl Çalışır?</a>
        </nav>
        
        <div className="flex items-center space-x-4">
          <Link 
            href="/login"
            className="hidden md:flex font-black uppercase tracking-widest hover:text-indigo-600 transition-colors"
          >
            Giriş Yap
          </Link>
          <Link 
            href="/studio"
            className="border-4 border-black bg-[#FFF67E] px-6 py-3 rounded-xl font-black uppercase shadow-[4px_4px_0px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0_rgba(0,0,0,1)] transition-all flex items-center space-x-2"
          >
            <span>Stüdyoya Git</span>
            <ArrowRight size={20} />
          </Link>
        </div>
      </header>

      <section className="px-6 md:px-12 py-20 md:py-32 flex flex-col items-center text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="inline-flex items-center space-x-2 border-4 border-black bg-[#B4E4FF] px-6 py-2 rounded-full font-black uppercase mb-8 shadow-[4px_4px_0px_0_rgba(0,0,0,1)] transform -rotate-2">
          <Sparkles size={20} className="text-indigo-600" />
          <span>Yeni Nesil AI Destekli Sanal Kabin</span>
        </div>
        
        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-8 max-w-5xl">
          Kıyafetleri <span className="text-indigo-600 underline decoration-8 underline-offset-8">Kendi Üzerinde</span> Görmeden Alma.
        </h2>
        
        <p className="text-xl md:text-2xl font-bold text-black/70 mb-12 max-w-3xl leading-relaxed">
          Sadece bir fotoğrafınla dijital ikizini yarat. Trendyol linkini yapıştır veya bir kıyafet fotoğrafı yükle, yapay zeka saniyeler içinde o kıyafeti sana giydirsin.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl justify-center">
          <Link 
            href="/onboarding"
            className="flex-1 border-4 border-black bg-indigo-600 text-white px-8 py-6 rounded-2xl text-2xl font-black uppercase shadow-[8px_8px_0px_0_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[12px_12px_0px_0_rgba(0,0,0,1)] transition-all flex items-center justify-center space-x-3"
          >
            <span>Dijital İkizini Yarat</span>
            <ArrowRight size={28} />
          </Link>
        </div>
      </section>

      <div className="border-y-4 border-black bg-[#FFB4B4] overflow-hidden py-4 flex whitespace-nowrap">
        <div className="animate-[marquee_20s_linear_infinite] flex space-x-12 font-black uppercase text-2xl tracking-widest">
          <span>🔥 Kusursuz Yüz Koruması</span>
          <span>•</span>
          <span>⚡ Saniyeler İçinde Sonuç</span>
          <span>•</span>
          <span>🛍️ Linkten Ürün Çekme</span>
          <span>•</span>
          <span>👗 Sınırsız Gardırop Arşivi</span>
          <span>•</span>
          <span>🔥 Kusursuz Yüz Koruması</span>
          <span>•</span>
          <span>⚡ Saniyeler İçinde Sonuç</span>
          <span>•</span>
          <span>🛍️ Linkten Ürün Çekme</span>
          <span>•</span>
          <span>👗 Sınırsız Gardırop Arşivi</span>
        </div>
      </div>

      <section id="ozellikler" className="px-6 md:px-12 py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16">
            <h2 className="text-5xl font-black uppercase tracking-tight max-w-2xl">
              Neden Hermes <br /> <span className="text-indigo-600">Tercih Edilmeli?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-4 border-black bg-[#FFF67E] rounded-3xl p-8 shadow-[8px_8px_0px_0_rgba(0,0,0,1)] hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-white border-4 border-black rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4">Kimliğin Korunur</h3>
              <p className="font-bold text-black/70 text-lg">
                Yüz hatların %100 oranında korunur. Yapay zeka yüzünü estetikleştirmez veya başka birine benzetmez. Tamamen sen!
              </p>
            </div>

            <div className="border-4 border-black bg-white rounded-3xl p-8 shadow-[8px_8px_0px_0_rgba(0,0,0,1)] hover:-translate-y-2 transition-transform md:-translate-y-8">
              <div className="w-16 h-16 bg-[#B4E4FF] border-4 border-black rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">
                <Zap size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4">Akıllı Ürün Çekimi</h3>
              <p className="font-bold text-black/70 text-lg">
                Beğendiğin kıyafetin resmini indirmekle uğraşma. E-ticaret linkini yapıştır, sistem kıyafeti saniyeler içinde çekip hazırlasın.
              </p>
            </div>

            <div className="border-4 border-black bg-[#FFB4B4] rounded-3xl p-8 shadow-[8px_8px_0px_0_rgba(0,0,0,1)] hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-white border-4 border-black rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_0_rgba(0,0,0,1)]">
                <Shirt size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4">Bulut Gardırop</h3>
              <p className="font-bold text-black/70 text-lg">
                Denediğin her güzel kombin bulut tabanlı gardırobuna kaydedilir. Dilediğin zaman girip eski denemelerine göz atabilirsin.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t-4 border-black bg-white py-12 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-6 md:space-y-0">
        <h2 className="text-3xl font-black tracking-tighter uppercase">Hermes.</h2>
        <p className="font-bold uppercase tracking-widest text-black/50">© 2026 Tüm Hakları Saklıdır.</p>
        <div className="font-bold uppercase tracking-widest">
          <span className="text-indigo-600">AI VTON</span> Teknolojisi ile Üretilmiştir
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}