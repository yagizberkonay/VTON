import * as cheerio from "cheerio";

export async function scrapeProductImage(url: string): Promise<string | null> {
  try {
    let finalUrl = url;

    if (url.includes("ty.gl") || url.includes("amzn.to")) {
      try {
        const unshortenRes = await fetch(`https://unshorten.me/json/${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(3000) 
        });
        const unshortenData = await unshortenRes.json();
        if (unshortenData.resolved_url) finalUrl = unshortenData.resolved_url;
      } catch (e) {
        console.log("Kısa link çözücü atlandı.");
      }
    }

    if (finalUrl.includes("trendyol")) {
      try {
        const productIdMatch = finalUrl.match(/-p-(\d+)/);
        if (productIdMatch && productIdMatch[1]) {
          const productId = productIdMatch[1];
          const apiUrl = `https://public.trendyol.com/discovery-web-productgw-service/api/productDetail/${productId}`;
          
          const apiRes = await fetch(apiUrl, {
            headers: {
              "User-Agent": "Trendyol/7.9.2.483 (iPhone; iOS 15.0; Scale/3.00)",
              "Accept": "application/json"
            },
            signal: AbortSignal.timeout(3000) 
          });

          if (apiRes.ok) {
            const data = await apiRes.json();
            if (data?.result?.images && data.result.images.length > 0) {
              let imgPath = data.result.images[0];
              if (!imgPath.startsWith('http')) imgPath = `https://cdn.dsmcdn.com/${imgPath}`;
              return imgPath; 
            }
          }
        }
      } catch (e) {
        console.log("Trendyol API DNS engeli yedi, yedek API'lere geçiliyor...");
      }
    }

    const apis = [
      `https://api.dub.co/metatags?url=${encodeURIComponent(finalUrl)}`,
      `https://jsonlink.io/api/extract?url=${encodeURIComponent(finalUrl)}`,
      `https://api.microlink.io?url=${encodeURIComponent(finalUrl)}`
    ];

    for (const apiUrl of apis) {
      try {
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) continue;
        
        const data = await res.json();
        let img = data?.image || data?.images?.[0] || data?.data?.image?.url;
        
        if (img && typeof img === 'string' && img.startsWith("http")) {
          return img; 
        }
      } catch (e) {
        continue; 
      }
    }

    try {
      const fallbackRes = await fetch(finalUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
        signal: AbortSignal.timeout(5000)
      });
      
      if (fallbackRes.ok) {
        const html = await fallbackRes.text();
        const $ = cheerio.load(html);

        if (finalUrl.includes("trendyol")) {
          const match = html.match(/"https:\/\/cdn\.dsmcdn\.com\/ty[^"]+"/);
          if (match) {
            return match[0].replace(/"/g, '').replace("/mnresize/128/192/", "/mnresize/1200/1800/");
          }
        }

        let img = $('meta[property="og:image"]').attr("content") || $('img').first().attr('src');
        if (img && img.startsWith('//')) img = 'https:' + img;
        if (img) return img;
      }
    } catch (e) {
      console.log("HTML kazıma başarısız.");
    }

    return null; 

  } catch (error) {
    console.error("Beklenmeyen Motor Hatası:", error);
    return null;
  }
}