import { Client } from "@gradio/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// 1. HERMES 2D VTON - SUNUCU DESTEKLİ GÜVENLİ MODEL (Sanal Deneme)
// ============================================================================
export async function generateVTON(personImageUrl: string, garmentImageUrl: string): Promise<string> {
  try {
    console.log("🚀 [HERMES VTON] Güvenli API Route üzerinden istek gönderiliyor...");

    const response = await fetch("/api/vton", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personImageUrl, garmentImageUrl }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Sanal deneme sunucu tarafında başarısız oldu.");
    }

    console.log("✅ [HERMES VTON] Sunucudan doğrudan hazır Base64 görsel alındı!");
    
    // Sunucu zaten Base64 çevirisini yaptı, doğrudan UI'a (Arayüze) yansıtıyoruz
    return data.resultImageBase64;

  } catch (err: any) {
    console.error("💥 [HERMES VTON HATA]:", err);
    throw new Error(err.message || String(err));
  }
}

// ============================================================================
// 2. GEMINI STİL DANIŞMANI (Objektif, JSON Çıktılı Mod)
// ============================================================================
export async function getStylistFeedback(imageInput: string): Promise<string> {
  try {
    console.log("👗 [GEMINI] Vizyoner stilist fotoğrafı inceliyor...");

    let rawBase64 = "";
    let mimeType = "image/jpeg";

    // 🔥 ÇÖZÜM: Gelen veri Supabase URL'si mi, yoksa Base64 mü? Dinamik olarak filtreliyoruz.
    if (imageInput.startsWith("http")) {
        console.log("📥 [GEMINI] Supabase URL'si algılandı, görsel arka planda indiriliyor...");
        const response = await fetch(imageInput);
        if (!response.ok) throw new Error("Gemini için görsel indirilemedi!");
        
        const blob = await response.blob();
        mimeType = blob.type || "image/jpeg";
        
        const base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        
        // Gemini "data:image/png;base64," önekini sevmez, sadece virgülden sonrasını (saf veriyi) veriyoruz
        rawBase64 = base64String.split(",")[1];
    } 
    else if (imageInput.startsWith("data:image")) {
        // Gelen veri zaten önekli bir Base64 ise
        mimeType = imageInput.substring(imageInput.indexOf(":") + 1, imageInput.indexOf(";"));
        rawBase64 = imageInput.split(",")[1];
    } 
    else {
        // Veri tamamen saf Base64 ise
        rawBase64 = imageInput;
    }

    // Gemini API Bağlantısı
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API Anahtarı bulunamadı!");

    // Eğer projenin en üstünde import etmediysen, genAI kütüphanesini burada çağırıyoruz
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Loglarda çalışan model olan 2.5-flash ve JSON koruması
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    // UI çökmesini engellemek için JSON şemasını KESİN ve KATI olarak belirliyoruz.
    const prompt = `Act as an objective, visionary fashion stylist. Analyze this outfit. 
    You MUST respond ONLY with a valid JSON format using exactly this structure:
    {
      "fit_percentage": "A number between 1-100 indicating the overall fit",
      "analysis": "A single, clear paragraph of brutal and objective text analyzing the style, colors, and body fit.",
      "recommendation": "A single paragraph of visionary recommendations to improve the outfit."
    }
    Do NOT create any nested objects or additional keys. Only return strings for analysis and recommendation. Responses must be in Turkish.`;
    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: rawBase64,
                mimeType: mimeType
            }
        }
    ]);

    console.log("✅ [GEMINI] Stil analizi başarıyla tamamlandı!");
    return result.response.text();
    
  } catch (err: any) {
    console.error("💥 [GEMINI HATA]:", err);
    throw new Error("Stil analizi şu anda yapılamıyor.");
  }
}

// ============================================================================
// 3. PIFUHD (3D ANATOMİ) SİSTEMİ 
// ============================================================================
export async function generate3DModel(imageUrl: string): Promise<string> {
  try {
    console.log("🧊 [HERMES AI] PIFuHD Motoruna bağlanılıyor...");
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

    console.log("🧊 [HERMES AI] 3D Model başarıyla örüldü! Hafızaya alınıyor...");
    const objText = await response.text();
    
    if (typeof window !== "undefined") {
      const blob = new Blob([objText], { type: "text/plain" });
      return URL.createObjectURL(blob);
    }
    return objText; 
  } catch (error: any) {
    console.error("💥 [HERMES PIFUHD HATA]:", error);
    throw new Error(error.message || "3D üretim sistemi şu anda yanıt vermiyor.");
  }
}
