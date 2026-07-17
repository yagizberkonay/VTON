import { Client } from "@gradio/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// 1. HERMES 2D VTON - SUNUCU DESTEKLİ GÜVENLİ MODEL (Sanal Deneme)
// ============================================================================
export async function generateVTON(personImageUrl: string, garmentImageUrl: string): Promise<string> {
  try {
    console.log("🚀 [HERMES VTON] Güvenli API Route üzerinden istek gönderiliyor...");

    // Doğrudan kendi yazdığımız Next.js API'sine vuruyoruz
    const response = await fetch("/api/vton", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personImageUrl, garmentImageUrl }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Sanal deneme sunucu tarafında başarısız oldu.");
    }

    const finalImageUrl = data.imageUrl;
    console.log("🔗 [HERMES VTON] Sunucudan URL Alındı, Base64'e dönüştürülüyor...");

    // Görseli tarayıcıya güvenle basmak için Base64 yapıyoruz
    const imageResponse = await fetch(finalImageUrl);
    if (!imageResponse.ok) throw new Error("Üretilen resim indirilemedi.");
    const imageBlob = await imageResponse.blob();
    
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    console.log("✅ [HERMES VTON] Görsel Şifrelendi (Base64)!");
    return base64String;

  } catch (err: any) {
    console.error("💥 [HERMES VTON HATA]:", err);
    throw new Error(err.message || String(err));
  }
}

// ============================================================================
// 2. GEMINI STİL DANIŞMANI (Objektif, JSON Çıktılı Mod)
// ============================================================================
export async function getStylistFeedback(imageBase64: string): Promise<string> {
  try {
    console.log("👗 [GEMINI] Vizyoner stilist fotoğrafı inceliyor...");

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) throw new Error("Gemini API anahtarı bulunamadı!");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // HTML değil, garantili resim Base64'ü geliyor
    const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

    const prompt = `
      Sen profesyonel, objektif ve dürüst bir moda analistisin. 
      Ekteki görselde, sanal olarak giydirilmiş bir kıyafet kombinasyonu görüyorsun.
      
      LÜTFEN ŞU KURALLARA KESİNLİKLE UY:
      1. Asla abartılı, yapay veya sahte övgüler kullanma.
      2. Yorumların kısa, net, yapısal ve tamamen objektif olsun.
      3. Kıyafetin omuzlara, vücut oranlarına ve genel silüetine nasıl oturduğunu teknik olarak analiz et.
      4. Eğer anatomik veya stilistik olarak uyumsuz, emanet duran bir detay varsa doğrudan belirt.
      
      ÇIKTIYI SADECE AŞAĞIDAKİ GİBİ SAF JSON FORMATINDA VER (Markdown kullanma, sadece JSON):
      {
        "fit_percentage": "85",
        "analysis": "Buraya acımasız ve teknik analizi yaz.",
        "recommendation": "Buraya net stilist önerisini yaz."
      }
    `;

    const imagePart = {
      inlineData: { data: cleanBase64, mimeType: mimeType }
    };

    const result = await model.generateContent([prompt, imagePart]);
    let responseText = result.response.text();

    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("✅ [GEMINI] Stil analizi tamamlandı.");
    return responseText;

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
