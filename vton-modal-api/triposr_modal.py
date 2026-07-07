import modal

# Modal uygulamasını tanımlıyoruz
app = modal.App("hermes-triposr-gradio")

# TripoSR için gerekli olan tüm kütüphaneleri ve bağımlılıkları kuruyoruz
triposr_image = (
    modal.Image.debian_slim(python_version="3.10")
    # Sistem bağımlılıkları: C++ derleyicisi ve grafik kütüphaneleri
    .apt_install("git", "libgl1-mesa-glx", "libglib2.0-0", "ninja-build", "build-essential")
    # CUDA 12.1 uyumlu PyTorch kurulumu
    .pip_install(
        "torch==2.1.2+cu121", 
        "torchvision==0.16.2+cu121",
        extra_options="--index-url https://download.pytorch.org/whl/cu121"
    )
    # Diğer gerekli Python kütüphaneleri
    .pip_install("gradio", "Pillow", "rembg", "transformers", "trimesh", "einops", "omegaconf")
    # xformers optimizasyon kütüphanesi
    .pip_install("xformers==0.0.23.post1")
    # KESİN ÇÖZÜM: pip install yerine resmi repoyu doğrudan sunucuya klonluyoruz
    .run_commands("git clone https://github.com/VAST-AI-Research/TripoSR.git /root/TripoSR")
)

# A10G GPU tahsis ediyoruz ve zaman aşımını 10 dakika (600s) yapıyoruz
@app.function(image=triposr_image, gpu="A10G", timeout=600)
@modal.asgi_app()
def gradio_app():
    import sys
    # Python'un klonladığımız TripoSR kodlarını (tsr modülü) bulabilmesi için yolu ekliyoruz
    sys.path.append("/root/TripoSR")

    import gradio as gr
    import torch
    import tempfile
    from PIL import Image
    
    # TripoSR (tsr) kütüphanelerini içe aktarıyoruz
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground

    print("[HERMES AI] TripoSR Modeli Yükleniyor...")
    
    # Modeli indirip GPU'ya (cuda:0) yüklüyoruz
    model = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    model.renderer.set_chunk_size(8192)
    model.to("cuda:0")
    
    print("[HERMES AI] Model Başarıyla Yüklendi ve Hazır!")

    # 3D Üretim İşlemini Yapan Ana Fonksiyon
    def generate_3d(image):
        if image is None:
            return None
            
        # 1. Arka planı sil ve nesneyi ortala
        image = remove_background(image, rembg_session=None)
        image = resize_foreground(image, 0.85)
        
        # 2. 3D Model (Mesh) üretimi
        with torch.no_grad():
            scene_codes = model(image.convert("RGB").unsqueeze(0).to("cuda:0"))
            mesh = model.extract_mesh(scene_codes)[0]
        
        # 3. Sonucu geçici bir GLB dosyası olarak dışa aktar
        out_path = tempfile.NamedTemporaryFile(suffix=".glb", delete=False).name
        mesh.export(out_path)
        
        return out_path

    # Gradio API Arayüzü
    demo = gr.Interface(
        fn=generate_3d, 
        inputs=gr.Image(type="pil"), 
        outputs=gr.Model3D()
    )
    
    return gr.routes.App.create_app(demo)