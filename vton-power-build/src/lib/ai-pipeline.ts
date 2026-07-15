// Eğer Next.js kullanıyorsan ve bu API key'leri barındırıyorsa bu satır güvenlik için önemlidir:
// "use server"; 

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// 1. VTON (2D SANAL DENEME) SİSTEMİ - [ÖZEL MODAL SUNUCUSU: SIFIR-MORFİNG]
// ============================================================================
export async function generateVTON(
  personImageUrl: string, 
  garmentImageUrl: string, 
  extraDetails?: string
): Promise<string> {
  try {
    console.log("[HERMES AI] Özel Modal VTON Sunucusuna Bağlanılıyor...");
    
    // Modal sunucumuz base64 formatında resim beklediği için URL'leri dönüştürüyoruz
    const fetchAsBase64 = async (url: string) => {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const humanB64 = await fetchAsBase64(personImageUrl);
    const clothB64 = await fetchAsBase64(garmentImageUrl);

    const MODAL_URL = process.env.NEXT_PUBLIC_MODAL_VTON_URL;
    if (!MODAL_URL) throw new Error("NEXT_PUBLIC_MODAL_VTON_URL bulunamadı!");

    // Doğrudan kendi sunucumuza ateşliyoruz
    const response = await fetch(MODAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        human_image: humanB64,
        cloth_image: clothB64
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Modal VTON Hatası: ${response.status} - ${errText}`);
    }

    const data = await response.json();

    if (data.image_url) {
      console.log("[HERMES AI] Sanal Deneme Başarılı! Sıfır-Morfing Görsel Alındı.");
      return data.image_url; // Gelen değer zaten base64, doğrudan ekrana basılabilir
    } else {
      throw new Error("Sunucu görsel döndüremedi.");
    }

  } catch (err: any) {
    throw new Error(err.message || String(err));
  }
}

// ============================================================================
// 2. PIFUHD (3D ANATOMİ) SİSTEMİ - [YENİ ROTAYA GÖRE SAF OBJ DÖNDÜRÜR]
// ============================================================================
export async function generate3DModel(imageUrl: string): Promise<string> {
  try {
    console.log("[HERMES AI] PIFuHD Motoruna bağlanılıyor...");

    // Yeni PIFuHD Modal linkini buraya eklemelisin (Sonunda /generate_3d olacak)
    const MODAL_URL = "https://yagizberkonay--hermes-pifuhd-api-pifuhdgenerator-generate-3d.modal.run"; 

    const response = await fetch(MODAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PIFuHD Sunucu Hatası: ${response.status} - ${errorText}`);
    }

    console.log("[HERMES AI] 3D Model başarıyla örüldü! Hafızaya alınıyor...");
    
    // Gelen ham .obj metnini alıyoruz
    const objText = await response.text();
    
    // Tarayıcının hafızasında geçici bir URL oluşturuyoruz (React Three Fiber vs için mükemmeldir)
    // Eğer bunu bir Node.js backend'inde çalıştırıyorsan blob yerine direkt objText de döndürebilirsin.
    if (typeof window !== "undefined") {
      const blob = new Blob([objText], { type: "text/plain" });
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    }
    
    return objText; // Backend'de çalışıyorsa direkt metni döndür
    
  } catch (error: any) {
    console.error("PIFuHD Modal Hatası:", error);
    throw new Error(error.message || "3D üretim sistemi şu anda yanıt vermiyor.");
  }
}

// ============================================================================
// 3. GEMINI STIL DANIŞMANI (YENİ EKLENTİ)
// ============================================================================

export interface StylistFeedback {
  fit_percentage: string;
  analysis: string;
  recommendation: string;
}

export async function getStylistFeedback(imageUrl: string): Promise<StylistFeedback> {
  try {
    console.log("[GEMINI] Vizyoner stilist fotoğrafı inceliyor...");

    // Gemini API Key'ini .env dosyandan alıyoruz
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("NEXT_PUBLIC_GEMINI_API_KEY bulunamadı!");

    const genAI = new GoogleGenerativeAI(apiKey);
    
const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Benim en güncel ve çalışan versiyonum
      generationConfig: { responseMimeType: "application/json" } 
    });

    // İnternetteki VTON sonucunu (URL) indirip Gemini'nin anlayacağı Base64 formatına çeviriyoruz
    const imageResp = await fetch(imageUrl);
    const arrayBuffer = await imageResp.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: imageResp.headers.get("content-type") || "image/jpeg",
      },
    };

    const systemPrompt = `
      Sen dünyaca ünlü, vizyoner, acımasız ama son derece dürüst bir kişisel stil danışmanısın. 
      Kullanıcıya yalan söyleme veya onu sırf mutlu etmek için iyi şeyler söyleme.
      
      Görevlerin:
      1. Görseldeki kişinin ten rengi / saç rengi ile kıyafetin renginin uyumunu analiz et.
      2. Kıyafetin omuzlara, gövdeye ve genel vücut tipine oturma (fit) durumunu incele.
      
      JSON formatında şu anahtarları döndür:
      - "fit_percentage": Yüzde kaç oranında oturduğu (örneğin "85").
      - "analysis": Kalıp ve renk uyumu hakkındaki dürüst, agresif ama yapıcı analizin.
      - "recommendation": Kişiye özel, ten rengini ve vücut tipini öne çıkaracak net bir sonraki kıyafet önerisi.
    `;

    const result = await model.generateContent([systemPrompt, imagePart]);
    const responseText = result.response.text();
    
    // Gemini'den gelen temiz JSON formatındaki string'i parse ediyoruz
    const feedback: StylistFeedback = JSON.parse(responseText);
    
    console.log("[GEMINI] Stilist raporu hazır!");
    return feedback;

  } catch (error: any) {
    console.error("Gemini Stil Danışmanı Hatası:", error);
    throw new Error("Stil analizi şu anda yapılamıyor.");
  }
}