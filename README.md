# مسار | بيئة التعلم القائمة على الذكاء الاصطناعي
# Masar | AI-Powered Adaptive Learning Environment

بيئة تعلم عربية تكيفية لتنمية التفكير التصميمي ومهارات إنتاج المعرفة لدى طلاب تكنولوجيا التعليم وفق مستويات تحمل الغموض المختلفة.

An adaptive Arabic digital learning environment designed to foster design thinking and knowledge production skills among educational technology students based on varying levels of ambiguity tolerance.

---

## 🌟 مميزات المشروع / Key Features

- **واجهة عربية متكاملة (RTL First):** تصميم عصري وتفاعلي يدعم الوضعين الفاتح والداكن (Light/Dark Mode).
- **مقياس تحمل الغموض (Ambiguity Tolerance Scale):** 20 عبارة وفق مقياس ليكرت الخماسي لتوجيه الطالب إلى المسار الأنسب.
- **ثلاثة مسارات تعلم تكيفية (Adaptive Learning Paths):**
  - **المسار المنظّم (Structured):** خطوات متتابعة ومنتظمة لبناء الفهم خطوة بخطوة.
  - **المسار الموجّه (Guided):** مسار مرن يقترح بدايات مناسبة مع حرية الاستكشاف.
  - **المسار المفتوح (Open):** مسار حر مفتوح يرتكز على الفضول والتجريب.
- **اختبار مهارات التفكير التصميمي (Design Thinking Skills Test):** 25 سؤالاً تقيس خمسة أبعاد (التعاطف، تحديد المشكلة، توليد الأفكار، بناء النماذج، الاختبار) مع مؤقت زمني 30 دقيقة.
- **محتوى المقرر الجامعي (Curriculum Content):** 4 فصول و38 درساً مستخرجة ومبنية آلياً من ملفات المصدر.
- **خصوصية كاملة وبدون خادم (Zero Backend / Full Privacy):** حفظ التقدم والمحاولات محلياً بنسبة 100% داخل المتصفح عبر `localStorage`.

---

## 🛠 التقنيات المستخدمة / Tech Stack

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Build Tool:** [Vite 7](https://vitejs.dev/)
- **Routing:** [Wouter](https://github.com/molefrog/wouter) (Client-side routing)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + CSS HSL Tokens
- **Icons:** [Lucide React](https://lucide.dev/)
- **UI Primitives:** Radix UI / shadcn-compatible components
- **Package Manager:** [pnpm](https://pnpm.io/) (Workspace Monorepo)

---

## 📂 هيكل المشروع / Project Structure

```text
├── artifacts/
│   └── masar-learning/          # تطبيق الواجهة الأمامية الأساسي (Frontend SPA)
├── attached_assets/              # أصول المصادر والصور الأصلية
├── content/
│   ├── source/                  # ملفات المقياس والاختبار بصيغة Markdown
│   ├── assessment-ambiguity.json
│   └── assessment-design-thinking.json
├── scripts/
│   ├── build-content.ts         # سكربت توليد محتوى فصول المقرر
│   ├── build-assessments.ts     # سكربت توليد الاختبارات والمقاييس
│   └── test-assessment.mjs      # اختبارات التحقق والتصحيح
├── package.json                 # الجذر الرئيسي لمساحة العمل
├── pnpm-workspace.yaml          # إعداد مساحة العمل وحزم pnpm
└── vercel.json                  # إعدادات النشر على Vercel
```

---

## 🚀 التشغيل المحلي / Local Development

### المتطلبات الأساسية / Prerequisites
- [Node.js](https://nodejs.org/) (v20 أو أحدث)
- [pnpm](https://pnpm.io/) (v9 أو أحدث)

### 1. تثبيت الحزم / Install Dependencies
```bash
pnpm install
```

### 2. تشغيل بيئة التطوير / Start Dev Server
```bash
pnpm --filter @workspace/masar-learning run dev
```
سيعمل السيرفر المحلي تلقائياً على الرابط: `http://localhost:5173`

### 3. فحص الأنواع / Typecheck
```bash
pnpm run typecheck
```

### 4. تشغيل اختبارات المقياس / Run Assessment Tests
```bash
pnpm --filter @workspace/masar-learning run test:assessment
```

### 5. بناء المشروع للإنتاج / Production Build
```bash
pnpm --filter @workspace/masar-learning run build
```
المخرجات ستكون في المجلد: `artifacts/masar-learning/dist`

---

## ☁️ النشر على Vercel / Deploying to Vercel

تم تضمين ملف `vercel.json` في جذر المشروع جاهزاً للنشر المباشر.

### إعدادات المشروع في Vercel (Project Settings):
- **Framework Preset:** `Vite` (أو `Other`)
- **Root Directory:** `./` (اتركه فارغاً أو الجذر الرئيسي)
- **Build Command:** `pnpm --filter @workspace/masar-learning run build`
- **Output Directory:** `artifacts/masar-learning/dist`
- **Install Command:** `pnpm install`
