# ⚡ Hermes AI VTON Studio

Hermes is a **Next-Generation AI-Powered Virtual Try-On** platform that allows users to seamlessly visualize garments on their own digital twins in seconds. 

Breaking away from standard, boring corporate designs, Hermes is built entirely on bold, thick-lined, and high-contrast **Neo-brutalism & Bento Grid** UI principles.

![Hermes Tech Stack](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Neo--Brutalism-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-DB_&_Auth-3ECF8E?style=for-the-badge&logo=supabase)
![AI VTON](https://img.shields.io/badge/AI-VTON_Pipeline-8B5CF6?style=for-the-badge&logo=openai)

## 🚀 Key Features

- **Absolute Identity Preservation:** The core philosophy of Hermes. While generating the try-on image, the AI model preserves the user's exact facial features, anatomical structure, and skin texture at a pixel level. It guarantees zero "beautification" and zero facial distortion. It's completely you!
- **Smart Link Scraper:** No need to manually download and upload product images. Just paste the e-commerce product link (e.g., Trendyol), and the system will automatically fetch the image straight into the studio.
- **Cloud-Based Wardrobe:** Successfully generated outfits are automatically saved to your personal cloud database. Users can easily browse their wardrobe archives, expand images to full size, or delete them anytime.
- **Instant Profile Updates:** Users can update their physical measurements (height/weight) and upload a new digital twin photo on the fly, without ever needing to log out. 
- **Neo-Brutalist & Mobile-Responsive UI:** 100% responsive, aggressive, and highly stylized UI/UX design.

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **AI Integration:** Custom VTON Image-to-Image Pipeline
- **Icons:** Lucide React

---

## ⚙️ Local Development Setup

Follow these steps to run the project on your local machine:

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/VTON.git](https://github.com/YOUR_USERNAME/VTON.git)
cd VTON

2. Install Dependencies
Bash

npm install

3. Setup Environment Variables

Create a .env.local file in the root directory and add your Supabase credentials:
Kod snippet'i

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Start the Development Server
Bash

npm run dev

Open http://localhost:3000 with your browser to see the Hermes Landing Page.
🗄️ Supabase Database Architecture

If you are setting this up with your own Supabase project from scratch, you need to configure the following tables and storage buckets:
1. Tables (SQL)
SQL

-- User Profiles
CREATE TABLE public.profiles (
  id uuid references auth.users primary key,
  avatar_url text,
  height text,
  weight text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Wardrobe Archive
CREATE TABLE public.wardrobe (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) Policies
ALTER TABLE public.wardrobe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wardrobe" ON public.wardrobe FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own wardrobe" ON public.wardrobe FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own wardrobe" ON public.wardrobe FOR DELETE USING (auth.uid() = user_id);

2. Storage Buckets

Create the following two buckets in your Supabase Storage dashboard and set them to Public:

    avatars (For user profile/digital twin photos)

    wardrobe (For AI-generated try-on outfits)

🎨 Design Philosophy

Instead of relying on boring, standard SaaS templates, this project utilizes a Bento Grid layout. Every interactive area is emphasized with thick black borders, brutalist drop shadows, and vibrant pop-art background colors (#FFF67E, #B4E4FF, #FFB4B4).
