import { TopicTemplate } from "../types";

export const PRESET_TOPICS: TopicTemplate[] = [
  {
    id: "studio-intro",
    titleAr: "مرحباً بكم في استوديو صَدَى للصوتيات",
    titleEn: "Welcome to Sada Audio Studio",
    categoryAr: "افتتاحية الاستوديو",
    categoryEn: "Studio Intro",
    defaultTextAr: "أهلاً ومرحباً بكم في استوديو صَدَى، منصتكم الاحترافية لتحويل النصوص إلى أصوات بشرية نابضة بالحياة بدقة وجودة فائقة. هنا نمنح كلماتكم صوتاً ونبرة تلامس الأسماع، باستخدام أحدث تقنيات الذكاء الاصطناعي التوليدي للصوت.",
    defaultTextEn: "Welcome to Sada Studio, your premier studio for turning written text into lifelike, expressive speech with studio-grade clarity. Here, your words gain voice and emotion through the most advanced neural audio intelligence.",
  },
  {
    id: "morning-keynote",
    titleAr: "صباح الخير أيها الرفاق: كلمة ملهمة",
    titleEn: "Good Morning Comrades: Inspiring Keynote",
    categoryAr: "خطاب تحفيزي",
    categoryEn: "Keynote Speech",
    defaultTextAr: "صباح الخير أيها الرفاق! اليوم بداية جديدة مليئة بالفرص والشغف. النجاح ليس ضربة حظ، بل هو نتيجة الإصرار اليومي والعمل المتقن. ثقوا بقدراتكم وانطلقوا لتحقيق أهدافكم بكل ثقة وعزيمة.",
    defaultTextEn: "Good morning comrades! Today is a fresh start filled with opportunities and passion. Success is never an accident; it is the compounding result of daily discipline and craftsmanship. Believe in your vision and move forward with unwavering confidence.",
  },
  {
    id: "dialogue-podcast",
    titleAr: "حوار إذاعي: الذكاء الاصطناعي ومستقبل الإبداع",
    titleEn: "Podcast Dialogue: AI & Creative Future",
    categoryAr: "حوار ثنائي",
    categoryEn: "Two-Speaker Dialogue",
    isDialogue: true,
    speaker1: "معتز",
    speaker2: "سارة",
    speaker1En: "Motaz",
    speaker2En: "Sara",
    voice1: "Puck",
    voice2: "Kore",
    defaultTextAr: `معتز: أهلاً بكم مستمعينا الكرام في حلقة اليوم، ومعنا الأستاذة سارة لمناقشة مستقبل الإبداع الصوتي.
سارة: شكراً لك يا معتز، يسعدني جداً التواجد معكم. العالم يشهد ثورة حقيقية في جودة الأصوات التوليدية.
معتز: بالفعل، كيف ترين تأثير هذه التقنيات على صناع المحتوى والبودكاست؟
سارة: إنها تفتح آفاقاً لا نهائية لإنتاج محتوى متعدد اللغات بنبرات طبيعية ومشوقة تختصر الوقت وتضاعف التأثير!
معتز: تماماً، وهذا بالتحديد ما نقدمه هنا في استوديو صَدَى.`,
    defaultTextEn: `Motaz: Welcome listeners to today's podcast! Today we have Sarah with us to discuss the future of synthetic media.
Sarah: Thanks Motaz, thrilled to be here. We are witnessing an extraordinary leap in neural audio realism.
Motaz: Absolutely. How do you see this transforming creators and storytellers?
Sarah: It democratizes high-fidelity audio production, letting anyone craft compelling narrations and multi-voice shows in seconds!
Motaz: Exactly, and that is our core mission at Sada Studio.`,
  },
  {
    id: "storytelling-narration",
    titleAr: "سرد قصصي: حارس المنارة والأفق البعيد",
    titleEn: "Audiobook Narration: The Lighthouse Keeper",
    categoryAr: "سرد وروايات",
    categoryEn: "Audiobook Narration",
    defaultTextAr: "كانت أمواج البحر الهادر تتكسر على صخور الشاطئ في تلك الليلة العاصفة. وقف الشيخ في قمة المنارة، يراقب وميض النور وهو يقطع الظلام الدامس ليرشد السفن التائهة إلى بر الأمان. في عينيه حكمة السنين، وفي قلبه هدوء لا تهزه الرياح العاتية.",
    defaultTextEn: "The stormy waves crashed relentlessly against the rugged shore. High atop the lighthouse tower, the old keeper watched the steady beam of light pierce through the dark tempest, guiding lost voyagers home to safety. In his eyes lay the calm wisdom of decades.",
  },
  {
    id: "commercial-voiceover",
    titleAr: "إعلان تجاري: إطلاق منتجك الجديد",
    titleEn: "Commercial Voiceover: Product Launch",
    categoryAr: "إعلانات ودعاية",
    categoryEn: "Commercial Promo",
    defaultTextAr: "هل تبحث عن التميز وتجربة استثنائية تفوق توقعاتك؟ نقدم لك اليوم الحل الذكي المصمم خصيصاً ليمنحك السرعة، السهولة، والأناقة في مكان واحد. لا تفوت الفرصة، انضم إلينا الآن واكتشف بعداً جديداً من الاحترافية!",
    defaultTextEn: "Are you searching for an extraordinary experience that exceeds your expectations? Introducing the smart solution engineered for speed, elegance, and peak performance. Don't wait—elevate your lifestyle today and discover pure innovation.",
  },
  {
    id: "science-documentary",
    titleAr: "وثائقي علمي: أسرار الفضاء والكون الفسيح",
    titleEn: "Science Documentary: Mysteries of the Cosmos",
    categoryAr: "وثائقيات",
    categoryEn: "Documentary",
    defaultTextAr: "في أعماق هذا الكون اللانهائي، تسبح مليارات المجرات في صمت مهيب. كل نجم نراه في سماء الليل يحمل حكاية قديمة بدأت منذ مليارات السنين الضوئية. رحلتنا لاستكشاف الفضاء ليست إلا محاولة لفهم أصلنا ومكاننا في هذا الوجود الشاسع.",
    defaultTextEn: "Across the boundless depths of the cosmos, billions of galaxies drift in majestic silence. Every star shining in the night sky holds an ancient story that began billions of light-years ago. Exploring the universe is our quest to understand our own origins.",
  },
];
