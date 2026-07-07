export async function generateVTON(
  personImageUrl: string, 
  garmentImageUrl: string, 
  extraDetails?: string
): Promise<string> {
  try {
    // Katı Yüz Koruma (Identity Preservation) Kök Promptu
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

    // Kullanıcı arayüzden ekstra detay girdiyse, bunu yapay zekanın ana komutuna ekliyoruz
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

export async function generate3DModel(imageUrl: string): Promise<string> {
  try {
    console.log("[HERMES AI] Frontend'den Vercel 3D API'sine istek atılıyor...");

    // İsteği doğrudan Vercel backend'imize yönlendiriyoruz
    const res = await fetch("/api/generate3d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `3D API Hatası (HTTP ${res.status})`);
    }

    // Backend'den (Modal'dan) gelen GLB dosyasını (Binary) alıp tarayıcıda okutulabilir bir URL'ye çeviriyoruz
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    console.log("[HERMES AI] 3D Model başarıyla frontend'e ulaştı!");
    return objectUrl;
    
  } catch (error) {
    console.error("Pipeline 3D Hatası:", error);
    throw error;
  }
}