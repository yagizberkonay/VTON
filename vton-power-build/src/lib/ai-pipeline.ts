// Eğer Next.js kullanıyorsan ve bu API key'leri barındırıyorsa bu satır güvenlik için önemlidir:
// "use server"; 

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// 1. VTON (2D SANAL DENEME) SİSTEMİ - [DOKUNULMADI, KUSURSUZ ÇALIŞIYOR]
// ============================================================================
export async function generateVTON(
  personImageUrl: string, 
  garmentImageUrl: string, 
  extraDetails?: string
): Promise<string> {
  try {
    const SYSTEM_PROMPT = `# CORE DIRECTIVE: ABSOLUTE IDENTITY PRESERVATION
You must treat the facial identity of the subject in the provided reference image as a STRICT AND HARD CONSTRAINT. The output must be the exact same individual, not a lookalike or a generic model.

## 1. FEATURE LOCKING PARAMETERS
* [Facial Landmarks]: Conduct a precise pixel-level analysis of the reference face. Strictly adhere to the exact bone structure, specific eye shape, precise nose bridge structure, jawline definition, and any unique facial asymmetries.
* [Anti-Beautification]: DO NOT "beautify," smoothen, or blend these features with generic AI faces. Preserve the authentic skin texture, natural lines, and realistic proportions.
* [Micro-Expressions]: Maintain the core anatomical look and neutral micro-expressions of the original subject.

## 2. SYSTEM PRIORITIZATION
* [Structure Over Style]: If a requested cinematic lighting, complex angle, or dramatic pose conflicts with facial visibility/accuracy, prioritize the strict correctness of the facial structure above all else.
* [Zero-Morphing]: The face must remain completely immune to the aesthetic styling of the background or clothing.

## 3. CONTEXTUAL ADAPTATION WORKFLOW
* [Variable Changes]: Apply changes ONLY to the environment, background context, attire (clothing), hair styling (if specified), and lighting conditions.
* [The "Step-In" Principle]: Execute the rendering as if the exact, living subject from the reference image stepped directly into the new scene.`;

    const finalPrompt = extraDetails && extraDetails.trim() !== ""
      ? `${SYSTEM_PROMPT}\n\n## 4. USER CUSTOM DETAILS (STYLE/GARMENT):\nApply these specific changes: ${extraDetails}`
      : SYSTEM_PROMPT;
    
    const MODAL_API_URL = "https://yagizberkonay--vton-engine-api-generate-vton.modal.run";

    const response = await fetch(MODAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personImage: personImageUrl,
        garmentImage: garmentImageUrl,
        prompt: finalPrompt
      }),
    });

    const data = await response.json();

    if (data.success === false) {
      throw new Error(`Yapay Zeka Sunucusu Hatası: ${data.error}`);
    }

    if (data.resultUrl) {
      return data.resultUrl;
    } else {
      throw new Error("Sunucu boş bir görsel döndürdü.");
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