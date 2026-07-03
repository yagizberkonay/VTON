export async function generateVTON(personImageUrl: string, garmentImageUrl: string): Promise<string> {
  try {
    const SYSTEM_PROMPT = `CORE DIRECTIVE: ABSOLUTE IDENTITY PRESERVATION...`; // Promptun duruyor
    
    // Kendi yeşil URL'in
    const MODAL_API_URL = "https://yagizberkonay--vton-engine-api-generate-vton.modal.run";

    const response = await fetch(MODAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personImage: personImageUrl,
        garmentImage: garmentImageUrl,
        prompt: SYSTEM_PROMPT
      }),
    });

    const data = await response.json();

    // SİSTEM ARTIK HATAYI ŞEFFAF BİR ŞEKİLDE YAKALIYOR
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