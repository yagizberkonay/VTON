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

<<<<<<< HEAD
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Sanal deneme sunucu tarafında başarısız oldu.");
=======
    const humanBlob = await fetchAsBlob(personImageUrl);
    const clothBlob = await fetchAsBlob(garmentImageUrl);

    // 🔥 ÇÖZÜM: Artık token'ın başında NEXT_PUBLIC_ var, tarayıcı bu şifreyi görebilecek!
    const token = process.env.NEXT_PUBLIC_HF_TOKEN;
    if (!token) console.warn("⚠️ [Uyarı] NEXT_PUBLIC_HF_TOKEN bulunamadı, anonim olarak deneniyor.");

    const app = await Client.connect("yisol/IDM-VTON", {
      hf_token: token,
    } as any);
    
    console.log("🧠 [HERMES VTON] Görseller gönderildi, işleniyor (Ort. 15-20 sn)...");

    // 🔥 Katı Kimlik Koruması (Zero-Morphing & Anti-Beautification)
    const result: any = await app.predict("/tryon", [
        { "background": humanBlob, "layers": [], "composite": null }, 
        clothBlob, 
        "photorealistic fashion garment, exact original facial features, unchanged bone structure, natural skin texture, unedited micro-expressions, zero beautification", 
        true, false, 30, 42, 
    ]);

    // Gradio'nun sakladığı URL'yi bulmak için Güvenli Tarama (Safe Parsing)
    let finalImageUrl = "";
    if (result?.data && Array.isArray(result.data)) {
        finalImageUrl = result.data[0]?.url || result.data[0];
    } else if (Array.isArray(result)) {
        finalImageUrl = result[0]?.url || result[0];
>>>>>>> 9af1acc19cb7be8605094692d81854bc9a1358f1
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
