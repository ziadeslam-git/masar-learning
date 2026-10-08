# مسار | بيئة التعلم الذكية

بيئة تعلم عربية تكيفية لطلاب تكنولوجيا التعليم. تعمل دون حسابات أو قاعدة بيانات، وتحفظ نتيجة التقييم والتقدم في المتصفح فقط.

## التشغيل

- `pnpm --filter @workspace/masar-learning run dev` للتشغيل محلياً.
- `pnpm --filter @workspace/masar-learning run build` لبناء الموقع.
- `pnpm --filter @workspace/masar-learning run typecheck` لفحص TypeScript.

يُحوّل `scripts/build-content.ts` ملف المنهج المرفق إلى `artifacts/masar-learning/src/data/curriculum.json` قبل التطوير والبناء. يُحدّث المصدر في `attached_assets/` ثم أعد تشغيل الأمر؛ لا تعدّل ملف JSON الناتج يدوياً.

## التعديل

- الأسئلة التجريبية: `artifacts/masar-learning/src/data/assessment.json`. كل سؤال يملك `id` و`prompt` و`reverse`.
- حدود المسارات: `artifacts/masar-learning/src/lib/config.ts`؛ أقل من 60% للمسار المنظّم، وأقل من 80% للموجّه، وما فوق ذلك للمفتوح.
- مصدر المنهج: ملف Markdown المرفق. تُحسب النتيجة بجمع الإجابات بعد عكس السؤال المعكوس (6 − الإجابة) ثم القسمة على الحد الأقصى.

لا يحتاج الموقع إلى متغيرات بيئة. مساعد الذكاء الاصطناعي اختياري وغير مفعّل في هذه النسخة الثابتة؛ يمكن إضافة `AI_API_KEY` عند توصيل خدمة المساعد لاحقاً.
