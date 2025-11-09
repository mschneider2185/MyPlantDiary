
# MyPlantDiary
Identify plants. Learn their needs. Track their growth.

MyPlantDiary is a plant‑care application built with **Next.js**, **TypeScript**, and **Supabase**.
It helps plant owners identify plants from photos, understand how to care for them, and maintain a personal plant journal.

---

## ✅ What MyPlantDiary Does
- Identify plants instantly from photos  
- Generate friendly “About Me” plant profiles  
- Let users save plants they own (“My Plants”)  
- Provide watering, fertilizing, and repotting reminders  
- Keep a personal plant journal with notes and photos  
- Offer optional disease/stress detection from images  

---

## 🎯 Product Goals
- Give users confidence in taking care of their plants  
- Provide fast and accurate identification  
- Offer simple, actionable care instructions  
- Create personalized, useful reminders  
- Build a clean and enjoyable plant‑tracking experience  

---

## 👥 Target Users
- New plant owners  
- Casual houseplant enthusiasts  
- Anyone who forgets when they last watered a plant  
- People who want a clean way to document plant care  

---

## 🌱 Core Features

### **1. Plant Identification**
Upload or take a photo → get top species matches with confidence scores.

### **2. “About Me” Plant Profiles**
Each species includes:
- Common & scientific names  
- Origin & background  
- Light / water / soil recommendations  
- Temperature & humidity guidance  
- Toxicity information  
- Fun facts  
Generated once using an LLM and cached.

### **3. My Plants (Ownership)**
Users can:
- Add plants  
- Assign nicknames  
- Set room/location  
- Attach photos  

### **4. Care Reminders**
Automatic, adjustable reminders for:
- Watering  
- Fertilizing  
- Repotting  
- Pruning  

Uses Supabase cron jobs.

### **5. Plant Journal**
A timeline of:
- Notes  
- Photos  
- Care history  
- Health tags  

### **6. Disease & Stress Detection**
Optional photo diagnostic with suggested treatments.

---

## 🧭 UX Principles
- Simple, clean, friendly  
- 1–2 tap flows  
- Visual and easy to understand  
- Avoid clutter  
- Advanced details hidden until needed  

---

## 🏗️ Tech Stack
- **Next.js 14 (App Router)**  
- **TypeScript (strict)**  
- **TailwindCSS**  
- **Supabase** (Auth, DB, Storage, Cron)  
- **Plant ID API** (Plant.ID, PlantNet, etc.)  
- **LLM generation for profiles**

---

## 🗄️ Database Overview
**Tables:**
- `species` – master plant data  
- `plants` – user‑owned plants  
- `reminders` – care tasks  
- `journal` – notes & photos  
- `diagnoses` – disease detection history  

Protected by RLS.

---

## 🚀 Roadmap

### ✅ MVP
- Identification  
- Species profile generation  
- Add to My Plants  
- Reminder system  
- Journal  
- Basic disease detection  

### ⏭️ Future
- Offline mode  
- Weather‑based care adjustments  
- Community feed  
- Growth tracking  

---

## 📈 Success Metrics
- Users identify a plant within 2 minutes  
- 40% Day‑7 retention  
- 3+ journal entries/month  
- 60% reminder completion  

---

## ⚠️ Risks
| Risk | Mitigation |
|------|------------|
| Misidentification | Show top 3 matches + scores |
| Missed care actions | Auto‑journal + simple UI |
| Storage cost | Client‑side compression |
| Disease uncertainty | Label results as “likely” |

---

This README is designed as a **project template**.  
Drop this into your new Cursor workspace and start building!
