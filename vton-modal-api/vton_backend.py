import modal
from pydantic import BaseModel

app = modal.App("vton-engine-api")

vton_image = (
    modal.Image.debian_slim()
    .pip_install(
        "gradio_client",
        "fastapi[standard]",
        "pillow"
    )
)

class VTONRequest(BaseModel):
    personImage: str
    garmentImage: str
    prompt: str

@app.function(image=vton_image, timeout=800)
@modal.fastapi_endpoint(method="POST")
def generate_vton(req: VTONRequest):
    from gradio_client import Client, handle_file
    import tempfile
    import urllib.request
    import base64
    import re
    import os

    print("VTON İstek Hattı Tetiklendi, Görseller Hazırlanıyor...")

    def save_to_temp(img_str, prefix):
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png", prefix=prefix)
        try:
            if img_str.startswith("http"):
                req_obj = urllib.request.Request(img_str, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req_obj) as response:
                    tmp.write(response.read())
            else:
                img_data = re.sub('^data:image/.+;base64,', '', img_str)
                tmp.write(base64.b64decode(img_data))
        finally:
            tmp.flush()
            tmp.close()
        return tmp.name

    try:
        person_path = save_to_temp(req.personImage, "person_")
        garment_path = save_to_temp(req.garmentImage, "garment_")

        client = Client("yisol/IDM-VTON")
        print("HuggingFace Kuyruğuna Girildi. Yüz Koruması Aktif...")

        # GÜNCELLENEN KISIM: Sadece zorunlu parametreleri gönderiyoruz
        result = client.predict(
            dict={"background": handle_file(person_path), "layers": [], "composite": None},
            garm_img=handle_file(garment_path),
            garment_des=req.prompt,
            is_checked=True,
            is_checked_crop=False,
            api_name="/tryon"
        )

        output_file_path = result[0] if isinstance(result, (tuple, list)) else result
        
        with open(output_file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            
        final_b64 = f"data:image/png;base64,{encoded_string}"
        
        os.remove(person_path)
        os.remove(garment_path)

        print("İşlem Başarılı! Dijital İkiz Giyindirildi.")
        return {
            "success": True,
            "resultUrl": final_b64
        }

    except Exception as e:
        print("Gradio Motoru Hatası:", str(e))
        return {
            "success": False,
            "error": str(e)
        }