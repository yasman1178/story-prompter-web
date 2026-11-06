# موتور موشن كوميك وملخصات المانجا السينمائية (Dynamic Manga Recaps & Motion Comic Engine)

خطة معمارية وتنفيذية متكاملة لتحويل الاستوديو إلى موتور موشن كوميك وسرد قصصي احترافي لملخصات المانجا (Manga Recaps) على يوتيوب وشورتس، يعتمد على تحويل صفحات المانجا الثابتة إلى كادرات حية ثلاثية الأبعاد (2.5D Parallax)، وتحريك كاميرا كين بيرنز المبرمج، وتوليد تأثيرات قتال المانجا (Speed Lines و Flash و Screen Shake)، ومزامنة الترجمة كلمة بكلمة مع Edge-TTS وتصدير كود متوافق تماماً مع Remotion و WebCodecs.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> تم استخلاص وتحديد المعالم الهندسية التالية استجابة لمطلب المستخدم لبناء موتور برمجى متكامل لملخصات المانجا:

- **Confirmed Decision 1: وضع مخصص للمانجا موشن كوميك (Dedicated Manga Mode)**:
  - إضافة نمط استوديو المانجا الموشن كوميك (Manga Motion Comic Studio) ليعمل بسلاسة داخل التطبيق بجانب أنماط السرد الحالية، مع واجهة كادر مانجا تفاعلية تدعم قياسات 9:16 للشورتس و 16:9 لفيديوهات اليوتيوب الطويلة.
- **Confirmed Decision 2: نظام إحداثيات الكادرات الهجين (Interactive Visual Cropper + JSON Ingestion)**:
  - دعم قراءة إحداثيات الكادرات `crop_box: [x, y, width, height]` مباشرة من كود JSON المولد بالذكاء الاصطناعي (NotebookLM / Gemini)، مع توفير أداة قص بصرية تفاعلية (Visual Panel Cropping Tool) على الكانفس تتيح للمستخدم ضبط حدود الكادر، واختيار الطبقة الأمامية (Foreground Cutout) والخلفية (Background Panel).
- **Confirmed Decision 3: محرك رندر مزدوج (Client-Side Real-Time WebCodecs + Remotion Composition Schema)**:
  - تشغيل معاينة حية فائقة السرعة في المتصفح وتصدير MP4/WebM مباشر عبر WebCodecs/Canvas، مع زر لتنزيل ملف تكوين Remotion (`remotion.config.json` و `Composition.tsx` و `scenes.json`) لمن يرغب في إكمال الرندر الاحترافي في السيرفر.
- **Confirmed Decision 4: تحديث وتوسيع صفحة الدليل المرجعي (/guide)**:
  - إضافة قسم متكامل في `/guide` يتضمن:
    1. البرومبت المرجعي لذكاء اصطناعي (System Prompt for Manga Recaps) لتوليد الـ JSON بالإحداثيات ومؤثرات الكاميرا والتعليق الصوتي.
    2. المواصفة القياسية للجيسون (Manga JSON Schema Specification v20) بما يشمل `crop_box`, `camera_motion`, `sfx`, `speed_lines`, `text_overlay`.
    3. كود قالب Remotion الجاهز للاستخدام مع مصفوفة المشاهد.

---

## 1. Overview & Core Concept

- **What It Does**:
  - تحويل صفحات المانجا الخام أو الكادرات المستخرجة إلى فيديوهات سينمائية متحركة ذات طابع شونين/سينين احترافي من خلال:
    1. تقطيع الكادر وعزل طبقات الشخصية والخلفية.
    2. تحريك بارالاكس 2.5D بكاميرا ديناميكية بطيئة وسريعة حسب إيقاع الحديث الصوتي.
    3. خطوط سرعة (Speed Lines) ومؤثرات اهتزاز الشاشة (Screen Shake) ومضات الضوء (Flashes) المتزامنة مع الضربات والصرخات.
    4. كلمات ترجمة متحركة تبرز المصطلحات الحماسية (Kinetic Word-by-Word Subtitles).
- **Target Audience / Persona**:
  - صانعو محتوى قنوات ملخصات المانجا والمانهوا والأنمي على يوتيوب وتيك توك الباحثون عن أتمتة الإنتاج، ورفع الـ Retention و CTR لأقصى حد بمجهود يدوي شبه منعدم.
- **Key Value**:
  - إنتاج فيديو كامل في دقائق معدودة بدقة 1080p أو شورتس 9:16 مع جودة بصرية تضاهي فرق المونتاج اليدوي الاحترافي.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **إدخال السيناريو وملف المانجا (Manga Project Input)**:
     - رفع ملف JSON المنشأ من NotebookLM أو كتابة السيناريو مباشرة.
     - رفع صفحات المانجا أو الكادرات الفردية، ليقوم النظام بتعيينها تلقائياً للمشاهد.
  2. **محرر الكادرات التفاعلي (Interactive Manga Panel & Layer Inspector)**:
     - معاينة الكادر مع إمكانية تحريك مستطيل القص (Crop Box) لتحديد منطقة التركيز.
     - تبديل وعزل الطبقة الأمامية (Foreground Cutout) وخلفية الكادر لضبط قوة البارالاكس (Parallax Depth Slider: 0% - 100%).
  3. **استوديو الحركة والمؤثرات (Manga VFX & Camera Director)**:
     - اختيار حركة الكاميرا: (Slow Zoom-In, Dramatic Zoom, Pan Left/Right, Dutch Angle Shake).
     - تفعيل مؤثرات المانجا: (Speed Lines, Impact Flash, Shadow Aura, Action Blur).
  4. **المعاينة الحية والتصدير (Live Studio Preview & Export)**:
     - تشغيل المعاينة المباشرة مع نطق الصوت المصري النقي لـ Edge-TTS وتزامن الكلمات.
     - تصدير الفيديو فوراً (MP4 / WebM) أو تنزيل حزمة Remotion للرندر السيرفري.

- **Visual Identity & Theme**:
  - **Aesthetic Direction**: تصميم استوديو داكن عالي الاحترافية مستوحى من أدوات المونتاج الرقمية والمانجا (Manga Ink Dark `#080B10` مع أسطح `#141A26` وحواف هادئة `#2A344A`).
  - **Color Palette**:
    - اللون الرئيسي (Primary): تركواز نيون متوهج `#00E5FF` لأزرار الإجراء والتحكم.
    - لون التأكيد (Accent): برتقالي/ذهبي مانجا حماسي `#F59E0B` للحركات والضربات.
    - لون التنبيه والخطر: قرمزي `#FF3B30` لخطوط السرعة والوميض الدرامي.
  - **Typography**: خط Cairo متزن وسلس مع أرقام جدولية مونو (`font-mono tabular-nums`) لمؤقتات الفريمات والمللي ثانية.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side WebCodecs/Canvas Render vs Node Server Remotion CLI**:
  - *Chosen Approach*: دعم محرك رندر تفاعلي فوري بالمتصفح باستخدام HTML5 Canvas + WebCodecs MP4 Muxer ليعمل فوراً دون خوادم ثقيلة، مع توفير تصدير كود Remotion التام (`Remotion Composition Generator`) لمن يريد رندرة السيرفر.
  - *Why*: يوفر استجابة فورية للمستخدم في المتصفح ويعمل على كل الأجهزة بدون تكاليف تشغيل سحابية إضافية.
- **Decision 2: إحداثيات الكادر النسبية (Normalized Percent Coordinates [0-100%])**:
  - *Chosen Approach*: تخزين إحداثيات الكادر كنسب مئوية `[x, y, width, height]` بدلاً من البكسل الثابت.
  - *Why*: يضمن توافق نفس الإحداثيات سواء كانت صورة الصفحة بدقة 1080p أو 4K، وتوافقها التام مع نسب العرض 9:16 و 16:9.
- **Decision 3: دعم التشكيل وعزل الطبقات الأمامية والخلفية**:
  - *Chosen Approach*: دعم صور مفرغة شفافة للطبقة الأمامية (`_fg`) مع خلفية الكادر (`_bg`)، وتوليد تأثير بارالاكس ديناميكي افتراضي تلقائي حتى في حال كانت الصورة واحدة عبر تقنية الانقسام البصري المتدرج.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Manga Script Input Stage                        │
│   - NotebookLM / Gemini Prompt Output (Manga Schema v20 JSON)          │
│   - Manga Chapter Pages / Cropped Panel Images Drop                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Manga Studio Store & Models                       │
│  StoryShot Schema v20:                                                 │
│    - panel_crop: { x: number, y: number, w: number, h: number }        │
│    - camera_motion: "zoom_in" | "zoom_out" | "pan_left" | "dramatic"   │
│    - manga_vfx: { speed_lines: boolean, screen_shake: number, flash } │
│    - voiceover_egyptian & word_boundaries (Edge-TTS)                   │
│    - foreground_cutout & background_panel layers                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Manga Motion Canvas & WebCodecs Pipeline                 │
│   1. Panel Crop Matrix Transformation                                  │
│   2. 2.5D Parallax Dual Layer Motion Engine                            │
│   3. Dynamic Procedural Speed Lines & Screen Shake Shader              │
│   4. Kinetic Word-by-Word Caption Subtitle Renderer                    │
│   5. Audio Mixer (Voiceover + SFX Sub-Booms + Ambient BGM)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Dual Output Architecture                             │
│   [A] Instant MP4/WebM Export via WebCodecs Muxer                      │
│   [B] Remotion Project Bundle (.tsx + scenes.json) Export              │
│   [C] Full Master Documentation & Prompts in /guide                    │
└────────────────────────────────────────────────────────────────────────┘
```

### المكونات والملفات المحددة للتطوير:
1. **`src/lib/types.ts`**:
   - إضافة أنواع كادرات المانجا `MangaPanelCrop`, `MangaVfxConfig`, `MangaCameraMotion`.
   - توسيع `StoryShot` و `StoryProject` لدمج خصائص الموشن كوميك بدون كسر التوافق القديم.
2. **`src/lib/data.ts`**:
   - تحديث `parseStoryJson` لاستيعاب هيكل كادرات المانجا وإحداثيات الـ Crop Box والمؤثرات.
   - إضافة مشروع مانجا نموذجي متكامل لاختبار الموشن كوميك (Solo Leveling / Attack on Titan).
3. **`src/lib/video-export.ts`**:
   - تطوير رسم الكادر بمحرك التحريك 2.5D: قص الصورة بحسب `crop_box`، تطبيق حركة البارالاكس المنفصلة بين الخلفية والعنصر الأمامي.
   - رسم خطوط السرعة السينمائية المبرمجة (Dynamic Speed Lines Generator).
   - تطبيق اهتزاز الكاميرا (Screen Shake) عند الضربات ومؤثرات وميض الفلاش (Flash Impact).
4. **`src/app/(studio)/guide/page.tsx`**:
   - تحديث شامل لدليل التعليمات ليتضمن:
     * برومبت نظام ذكاء اصطناعي احترافي (Manga Recap AI Prompt) مهيأ لـ NotebookLM و Gemini.
     * توثيق كامل لمصفوفة الإحداثيات والمؤثرات الصوتية والبصرية.
     * كود Remotion الجاهز للربط والتكامل.
5. **`src/components/studio/manga-panel-cropper-modal.tsx` (مكون جديد)**:
   - نافذة تفاعلية تتيح للمستخدم تحديد وتعديل مستطيل قص الكادر يدوياً على الصفحة وتحديث إحداثياته في المشروع بنقرة واحدة.

---

## Verification & Testing Plan

1. التحقق من بناء المشروع بالكامل عبر `compile_applet` وخلوه من أخطاء `lint_applet`.
2. اختبار استيراد ملف JSON يحتوي على إحداثيات كادر ومؤثرات موشن كوميك والتأكد من قص الكادر ورسمه بدقة.
3. اختبار المعاينة الحية لخطوط السرعة (Speed Lines) والبارالاكس المتزامن مع الصوت والترجمة كلمة بكلمة.
4. التأكد من عمل تصدير الفيديو (MP4/WebM) بسرعة وثبات وتوافق صفحة الدليل المرجعي.
