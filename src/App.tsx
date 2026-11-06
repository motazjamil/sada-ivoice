/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from "react";
import { Header } from "./components/Header";
import { AudioPlayer } from "./components/AudioPlayer";
import { SpeechStudio } from "./components/SpeechStudio";
import { GeneratedAudioItem } from "./types";
import { PRESET_TOPICS } from "./data/topics";
import {
  Mic2,
  Info,
  Github,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";

// Code Splitting & Lazy Loading for Performance (reduces initial JS bundle & accelerates LCP)
const TopicGenerator = lazy(() =>
  import("./components/TopicGenerator").then((m) => ({ default: m.TopicGenerator }))
);
const LibraryDrawer = lazy(() =>
  import("./components/LibraryDrawer").then((m) => ({ default: m.LibraryDrawer }))
);

export default function App() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const isAr = lang === "ar";
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Active Editor State - Starts clean and empty so placeholder displays immediately
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [presetMeta, setPresetMeta] = useState<{ title: string; text: string } | null>(null);
  const [isDialogue, setIsDialogue] = useState(false);
  const [speaker1, setSpeaker1] = useState(isAr ? "معتز" : "Motaz");
  const [speaker2, setSpeaker2] = useState(isAr ? "سارة" : "Sara");
  const [voice1, setVoice1] = useState("Puck");
  const [voice2, setVoice2] = useState("Kore");

  // Audio Playback & Library
  const [audioItems, setAudioItems] = useState<GeneratedAudioItem[]>([]);
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudioItem | null>(null);

  // Handle New Generated Audio
  const handleAudioGenerated = (item: GeneratedAudioItem) => {
    setAudioItems((prev) => [item, ...prev]);
    setCurrentAudio(item);
  };

  // Handle Quick Opening Sample Selection
  const handleQuickPlayOpening = () => {
    const opening = PRESET_TOPICS[0];
    const openingText = isAr ? opening.defaultTextAr : opening.defaultTextEn;
    const openingTitle = isAr ? opening.titleAr : opening.titleEn;
    setText(openingText);
    setPresetMeta({ title: openingTitle, text: openingText });
    setTitle(openingTitle);
    setIsDialogue(false);
  };

  // Handle Topic Selection from presets or AI Generator
  const handleSelectTopicText = (
    newText: string,
    newTitle: string,
    dialogueMode = false,
    spk1?: string,
    spk2?: string,
    v1?: string,
    v2?: string
  ) => {
    setText(newText);
    setPresetMeta({ title: newTitle, text: newText });
    setTitle(newTitle);
    setIsDialogue(dialogueMode);
    if (spk1) setSpeaker1(spk1);
    if (spk2) setSpeaker2(spk2);
    if (v1) setVoice1(v1);
    else if (dialogueMode) setVoice1("Puck");
    if (v2) setVoice2(v2);
    else if (dialogueMode) setVoice2("Kore");
  };

  // Delete Track
  const handleDeleteTrack = (id: string) => {
    setAudioItems((prev) => prev.filter((item) => item.id !== id));
    if (currentAudio?.id === id) {
      setCurrentAudio(null);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#F7F4EE] text-[#0F1E36] flex flex-col ${isAr ? "font-sans" : ""}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Top Header */}
      <Header
        lang={lang}
        setLang={(newLang) => {
          setLang(newLang);
          if (newLang === "en") {
            if (speaker1 === "معتز" || speaker1 === "المتحدث 1") setSpeaker1("Motaz");
            if (speaker2 === "سارة" || speaker2 === "المتحدث 2") setSpeaker2("Sara");
          } else {
            if (speaker1 === "Motaz" || speaker1 === "Speaker 1") setSpeaker1("معتز");
            if (speaker2 === "Sara" || speaker2 === "Speaker 2") setSpeaker2("سارة");
          }
        }}
        onQuickPlayOpening={handleQuickPlayOpening}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero Banner: Warm Ivory Foundation, Deep Editorial Blue Typography, Coral Orange Details */}
        <section
          id="hero-statement"
          className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 sm:p-7 shadow-[0_1px_3px_rgba(20,33,61,0.03)]"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C6B88]">
                <Mic2 className="w-3.5 h-3.5 text-[#E25C47]" />
                <span>{isAr ? "استوديو تحويل النصوص إلى صوت طبيعي" : "Neural Text-to-Speech Studio"}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F1E36] tracking-tight leading-snug">
                {isAr
                  ? "صَدَى iVoice | تحويل النصوص إلى أصوات بشرية طبيعية وواقعية"
                  : "Sada iVoice | Transform Written Words into Natural, Expressive Audio"}
              </h2>
              <p className="text-xs sm:text-sm text-[#5C6B88] leading-relaxed">
                {isAr
                  ? "استوديو صَدَى (Sada iVoice) المتكامل لتحويل النصوص والمحادثات إلى مقاطع صوتية نقية بدقة 24kHz ونبرات متعددة بالذكاء الاصطناعي. تطوير م. معتز جميل."
                  : "Sada iVoice Studio synthesizes studio-grade 24kHz speech with expressive human inflections and multi-speaker dialogues. Engineered by Eng.Motaz Jamil."}
              </p>
            </div>

            {/* Quick Metrics / Highlights */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 flex-shrink-0">
              <div className="bg-[#FAF7F2] border border-[#E5DED2] rounded-xl p-3 text-center">
                <div className="text-[#0F1E36] font-bold text-sm sm:text-base font-mono tabular-nums">24 kHz</div>
                <div className="text-[10px] sm:text-xs text-[#475569] font-medium">{isAr ? "دقة الصوت" : "Sample Rate"}</div>
              </div>
              <div className="bg-[#FAF7F2] border border-[#E5DED2] rounded-xl p-3 text-center">
                <div className="text-[#0F1E36] font-bold text-sm sm:text-base font-mono tabular-nums">6 Voices</div>
                <div className="text-[10px] sm:text-xs text-[#475569] font-medium">{isAr ? "أصوات عصبية" : "Neural Voices"}</div>
              </div>
              <div className="bg-[#FAF7F2] border border-[#E5DED2] rounded-xl p-3 text-center">
                <div className="text-[#0F1E36] font-bold text-xs sm:text-sm font-mono">Gemini Flash TTS</div>
                <div className="text-[10px] sm:text-xs text-[#475569] font-medium">{isAr ? "محرك الصوت" : "TTS Engine"}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Studio Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Main Column: Speech Studio (Text Input) + Audio Player (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Visual Priority: Text to Speech Synthesizer Studio */}
            <SpeechStudio
              lang={lang}
              text={text}
              setText={setText}
              title={title}
              setTitle={setTitle}
              presetMeta={presetMeta}
              setPresetMeta={setPresetMeta}
              isDialogue={isDialogue}
              setIsDialogue={setIsDialogue}
              speaker1={speaker1}
              setSpeaker1={setSpeaker1}
              speaker2={speaker2}
              setSpeaker2={setSpeaker2}
              voice1={voice1}
              setVoice1={setVoice1}
              voice2={voice2}
              setVoice2={setVoice2}
              onAudioGenerated={handleAudioGenerated}
              existingAudioItems={audioItems}
              onSelectExistingTrack={(item) => setCurrentAudio(item)}
            />

            {/* Active Audio Player with Waveform & Controls */}
            <AudioPlayer
              currentAudio={currentAudio}
              lang={lang}
            />
          </div>

          {/* Right Column: Presets, AI Topic Generator, and Library (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Presets & AI Script Generator (Lazy Loaded) */}
            <Suspense
              fallback={
                <div className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 shadow-[0_1px_3px_rgba(20,33,61,0.03)] space-y-4 animate-pulse min-h-[220px]">
                  <div className="h-5 w-40 bg-[#EAE3D9] rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 bg-[#FAF7F2] rounded-xl border border-[#E5DED2]" />
                    <div className="h-16 bg-[#FAF7F2] rounded-xl border border-[#E5DED2]" />
                  </div>
                </div>
              }
            >
              <TopicGenerator
                lang={lang}
                onSelectTopicText={handleSelectTopicText}
              />
            </Suspense>

            {/* Session Audio Library (Lazy Loaded) */}
            <Suspense
              fallback={
                <div className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 shadow-[0_1px_3px_rgba(20,33,61,0.03)] space-y-3 animate-pulse min-h-[140px]">
                  <div className="h-5 w-32 bg-[#EAE3D9] rounded-lg" />
                  <div className="h-14 bg-[#FAF7F2] rounded-xl border border-[#E5DED2]" />
                </div>
              }
            >
              <LibraryDrawer
                lang={lang}
                items={audioItems}
                activeId={currentAudio?.id || null}
                onSelectTrack={(item) => setCurrentAudio(item)}
                onDeleteTrack={handleDeleteTrack}
                onClearAll={() => {
                  setAudioItems([]);
                  setCurrentAudio(null);
                }}
              />
            </Suspense>

            {/* Voice Pro Tips Card */}
            <div className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-4 space-y-2 shadow-[0_1px_3px_rgba(20,33,61,0.02)] text-[#5C6B88]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F1E36]">
                <Info className="w-3.5 h-3.5 text-[#E25C47]" />
                <span>{isAr ? "نصائح للحصول على أفضل إلقاء صوتي:" : "Tips for Studio-Grade Results:"}</span>
              </div>
              <ul className="text-xs text-[#475569] space-y-1.5 list-disc list-inside leading-relaxed font-medium">
                <li>
                  {isAr
                    ? "استخدم الفواصل والنقاط بدقة لضبط الوقفات الطبيعية والتنفس أثناء النطق."
                    : "Use commas and periods intentionally to guide natural breathing pauses."}
                </li>
                <li>
                  {isAr
                    ? "اختر وضع 'حوار ثنائي' لتوليد محادثة متبادلة بصوتين مختلفين في ملف واحد."
                    : "Switch to 'Two Speakers' mode to generate alternating voices in one track."}
                </li>
                <li>
                  {isAr
                    ? "حدد أسلوب الإلقاء المناسب لنصك (إعلاني، سرد قصصي، إذاعي، أو حماسي)."
                    : "Tailor the vocal delivery style to match your content's mood and intent."}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* SEO Information & FAQs Section — Search Indexing Grounding */}
        <section
          id="seo-faq-section"
          aria-label={isAr ? "دليل منصة صَدَى والأسئلة الشائعة" : "Sada iVoice Knowledge Base & FAQs"}
          className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 sm:p-7 shadow-[0_1px_3px_rgba(20,33,61,0.03)] space-y-4"
        >
          <div className="border-b border-[#EAE3D9] pb-3">
            <h3 className="text-sm sm:text-base font-bold text-[#0F1E36] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E25C47]" />
              <span>
                {isAr
                  ? "عن استوديو صَدَى (Sada iVoice) والأسئلة الشائعة"
                  : "About Sada iVoice Studio & Frequently Asked Questions"}
              </span>
            </h3>
            <p className="text-xs text-[#5C6B88] mt-1 leading-relaxed">
              {isAr
                ? "منصة متطورة لتحويل النصوص إلى أصوات بشرية طبيعية بدقة 24kHz ونبرات متعددة بالذكاء الاصطناعي، مطورة بواسطة م. معتز جميل (Eng.Motaz Jamil)."
                : "Next-generation neural speech synthesis producing ultra-HD 24kHz audio in Arabic and English. Engineered by Eng.Motaz Jamil."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#5C6B88]">
            <article className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DED2] space-y-1.5">
              <h4 className="font-bold text-[#0F1E36] text-[13px]">
                {isAr ? "ما هي مميزات محرك صَدَى (Sada iVoice)؟" : "What makes Sada iVoice unique?"}
              </h4>
              <p className="leading-relaxed text-[#5C6B88]">
                {isAr
                  ? "يعتمد صَدَى على أحدث خوارزميات التوليد الصوتي العصبي Gemini Flash TTS مع معدل عينة 24,000 هرتز وأصوات بشرية واقعية، بالإضافة لدعم الحوار الصوتي الثنائي المتناوب في ملف صوتي واحد."
                  : "Sada iVoice utilizes Gemini Flash TTS delivering 24,000 Hz sample rate output, diverse emotional delivery styles, and native multi-speaker dual dialogue synthesis."}
              </p>
            </article>

            <article className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DED2] space-y-1.5">
              <h4 className="font-bold text-[#0F1E36] text-[13px]">
                {isAr ? "من هو مطور التطبيق؟" : "Who developed Sada iVoice?"}
              </h4>
              <p className="leading-relaxed text-[#5C6B88]">
                {isAr
                  ? "تم تصميم وهندسة وتطوير تطبيق صَدَى (Sada iVoice) بالكامل بواسطة المهندس معتز جميل (Eng.Motaz Jamil) لتقديم تجربة تحويل نصوص احترافية تحاكي الأداء البشري."
                  : "Sada iVoice was designed, architected, and developed by Eng.Motaz Jamil to provide human-centered, broadcast-grade speech synthesis."}
              </p>
            </article>

            <article className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DED2] space-y-1.5">
              <h4 className="font-bold text-[#0F1E36] text-[13px]">
                {isAr ? "هل يدعم التطبيق اللغة العربية الفصحى؟" : "Does it support Arabic and English?"}
              </h4>
              <p className="leading-relaxed text-[#5C6B88]">
                {isAr
                  ? "نعم، يدعم التطبيق اللغة العربية الفصحى بدقة فائقة مع نطق سليم للحركات ومخارج الحروف، كما يدعم اللغة الإنجليزية بلكنات واضحة ومتنوعة تلائم الإعلانات، الوثائقيات، والبودكاست."
                  : "Yes, full support for Modern Standard Arabic with phoneme precision and natural pacing, alongside expressive English accents for podcasts, audiobooks, and commercials."}
              </p>
            </article>

            <article className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DED2] space-y-1.5">
              <h4 className="font-bold text-[#0F1E36] text-[13px]">
                {isAr ? "كيف يمكن تنزيل المقاطع الصوتية؟" : "How can audio files be exported?"}
              </h4>
              <p className="leading-relaxed text-[#5C6B88]">
                {isAr
                  ? "بمجرد توليد الصوت في مشغل الاستوديو، يمكنك الاستماع الفوري إليه، تعديل سرعة التشغيل، وتنزيله مباشرة بصيغة WAV أو MP3 عالية النقاء بضغطة زر واحدة."
                  : "Once synthesized, the built-in player allows real-time waveform inspection, variable playback speeds, and one-click export to uncompressed WAV or MP3 format."}
              </p>
            </article>
          </div>
        </section>
      </main>

      {/* Studio Footer — Copyright, Ownership & Links */}
      <footer className="border-t border-[#EAE3D9] bg-[#FFFDF9] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          {/* SECTION 6: Footer links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#5C6B88]">
            <a
              href="https://github.com/motazjamil"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#0F1E36] transition-colors"
            >
              <Github className="w-3.5 h-3.5 text-[#5C6B88]" />
              <span>GitHub</span>
            </a>
            <span className="text-[#E5DED2]">·</span>
            <a
              href="mailto:contact@Motazjm245.com"
              className="inline-flex items-center gap-1.5 hover:text-[#0F1E36] transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#5C6B88]" />
              <span>contact@Motazjm245.com</span>
            </a>
            <span className="text-[#E5DED2]">·</span>
            <button
              type="button"
              id="btn-privacy-policy"
              onClick={() => setIsPrivacyOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#0F1E36] hover:text-[#E25C47] transition-colors font-medium cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#E25C47]" />
              <span>{isAr ? "الخصوصية" : "Privacy Policy"}</span>
            </button>
          </div>

          <div className="h-px bg-[#EAE3D9]/60 max-w-xl mx-auto" />

          {/* Copyright notice row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <p
              dir="rtl"
              className="text-xs sm:text-sm font-medium text-[#0F1E36] text-center sm:text-start"
            >
              جميع الحقوق لـ م. معتز جميل
            </p>
            <p
              dir="ltr"
              className="text-xs sm:text-[13px] font-normal text-[#5C6B88] text-center sm:text-end font-sans tracking-tight"
            >
              All Rights Reserved © Eng.Motaz Jamil
            </p>
          </div>
        </div>
      </footer>

      {/* SECTION 6: Privacy Policy Modal */}
      {isPrivacyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setIsPrivacyOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#FFFDF9] rounded-2xl border border-[#EAE3D9] p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-3">
              <div className="flex items-center gap-2 text-[#0F1E36] font-bold text-sm sm:text-base">
                <ShieldCheck className="w-4 h-4 text-[#E25C47]" />
                <h3>{isAr ? "سياسة الخصوصية وحفظ البيانات" : "Privacy & Data Policy"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="text-[#5C6B88] hover:text-[#0F1E36] p-1 rounded-md cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-[#5C6B88] leading-relaxed space-y-2.5">
              <p>
                {isAr
                  ? "• يتم إرسال النصوص المدخلة بأمان عبر تشفير HTTPS إلى واجهة برمجة تطبيقات Google Gemini حصرياً لتوليد الصوت العصبي."
                  : "• Input texts are transmitted securely via HTTPS to Google's Gemini API solely to synthesize neural voiceover audio."}
              </p>
              <p>
                {isAr
                  ? "• تُحفظ المقاطع الصوتية الناتجة والمكتبة محلياً فقط داخل متصفحك على هذا الجهاز ولا يتم تخزينها أو مشاركتها على أي خوادم خارجية."
                  : "• Generated audio tracks and session library are retained exclusively within your local browser storage on this device."}
              </p>
              <p>
                {isAr
                  ? "• لا نقوم بجمع أو تعقب أي بيانات شخصية أو حسابات مستخدمين، وتبقى نصوصك وتسجيلاتك الصوتية تحت تحكمك الكامل."
                  : "• We do not collect, profile, or sell personal user data. Your text scripts and audio files remain strictly under your control."}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-[#FFFDF9] hover:bg-[#1E3050] transition-colors cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
