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

import { Client } from "@gradio/client";

export async function generate3DModel(imageUrl: string): Promise<string> {
  try {
    console.log("[HERMES AI] Modal TripoSR sunucusuna bağlanılıyor...");

    const MODAL_URL = "https://yagizberkonay--hermes-triposr-gradio-gradio-app.modal.run"; 

    const client = await Client.connect(MODAL_URL);

    console.log("[HERMES AI] Görsel işleniyor, 3D model üretimi başladı...");

    const result: any = await client.predict("/predict", { 		
        image: imageUrl, 
    });

    const glbUrl = result.data[0].url; 
    
    console.log("[HERMES AI] 3D Model başarıyla teslim alındı!");
    return glbUrl;
    
  } catch (error) {
    console.error("TripoSR Modal Hatası:", error);
    throw new Error("3D üretim sistemi şu anda yanıt vermiyor.");
  }
}