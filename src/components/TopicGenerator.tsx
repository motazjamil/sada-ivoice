import React, { useState, useEffect, useRef } from "react";
import { Sparkles, RefreshCw, Wand2, Users, Mic, Layers, AlertCircle } from "lucide-react";
import { PRESET_TOPICS } from "../data/topics";

interface TopicGeneratorProps {
  lang: "ar" | "en";
  onSelectTopicText: (
    text: string,
    title: string,
    isDialogue?: boolean,
    spk1?: string,
    spk2?: string,
    v1?: string,
    v2?: string
  ) => void;
}

export const TopicGenerator: React.FC<TopicGeneratorProps> = ({ lang, onSelectTopicText }) => {
  const isAr = lang === "ar";
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"speech" | "dialogue">("speech");
  const [selectedTone, setSelectedTone] = useState<"inspiring" | "expert" | "practical" | "story">("inspiring");
  const [hasError, setHasError] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up any running timers or pending requests on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGenerateScript = async () => {
    // Prevent double submission
    if (generating) return;

    setGenerating(true);
    setHasError(false);
    setElapsed(0);

    // Track elapsed seconds while request is in flight
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    timerRef.current = timer;

    // 45-second timeout controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:
            customPrompt.trim() ||
            (isAr ? "نص إلقاء صوتي احترافي في استوديو صَدَى" : "A professional voiceover script in Sada Studio"),
          format: selectedFormat,
          language: lang,
          tone: selectedTone,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (!data || !data.script) {
        throw new Error("Invalid response: missing script data");
      }

      const trimmedIdea = customPrompt.trim();
      const title = trimmedIdea
        ? isAr
          ? `نص: ${trimmedIdea.length > 30 ? trimmedIdea.slice(0, 30) + "…" : trimmedIdea}`
          : `Script: ${trimmedIdea.length > 30 ? trimmedIdea.slice(0, 30) + "…" : trimmedIdea}`
        : isAr
        ? "نص استوديو صَدَى الصوتي"
        : "Sada Studio Voiceover Script";

      onSelectTopicText(
        data.script,
        title,
        selectedFormat === "dialogue",
        isAr ? "معتز" : "Motaz",
        isAr ? "سارة" : "Sara",
        "Puck",
        "Kore"
      );
    } catch (err: any) {
      // Technical error strictly logged to console, never shown to user on screen
      console.error("AI Script Composer error:", err);
      // Retain customPrompt, mode and tone; show friendly bilingual message
      setHasError(true);
    } finally {
      clearTimeout(timeoutId);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGenerating(false);
    }
  };

  return (
    <div
      id="topic-generator-card"
      className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(20,33,61,0.03)] space-y-5"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F3EFE7] flex items-center justify-center text-[#E25C47]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#0F1E36]">
              {isAr ? "قوالب ونماذج جاهزة" : "Ready Voice Templates"}
            </h2>
            <p className="text-xs text-[#5C6B88]">
              {isAr
                ? "انقر على أي نموذج لتعبئة مساحة الكتابة وتجربة الصوت فوراً"
                : "Click any script to populate the editor and test the voices"}
            </p>
          </div>
        </div>
      </div>

      {/* Preset Topics Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_TOPICS.map((topic) => {
            const titleText = isAr ? topic.titleAr : topic.titleEn;
            const descText = isAr ? topic.defaultTextAr : topic.defaultTextEn;
            return (
              <button
                key={topic.id}
                id={`preset-topic-${topic.id}`}
                type="button"
                title={`${titleText} — ${descText}`}
                onClick={() => {
                  onSelectTopicText(
                    descText,
                    titleText,
                    topic.isDialogue,
                    isAr ? (topic.speaker1 || "معتز") : (topic.speaker1En || "Motaz"),
                    isAr ? (topic.speaker2 || "سارة") : (topic.speaker2En || "Sara"),
                    topic.voice1 || (topic.isDialogue ? "Puck" : undefined),
                    topic.voice2 || (topic.isDialogue ? "Kore" : undefined)
                  );
                }}
                className="text-start flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EFE7] border border-[#E5DED2] hover:border-[#C4BCAD] transition-all text-[#0F1E36] group cursor-pointer h-full min-h-[76px]"
              >
                <div className="w-6 h-6 rounded-md bg-[#F3EFE7] group-hover:bg-[#E25C47] group-hover:text-[#FFFDF9] text-[#5C6B88] flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                  {topic.isDialogue ? <Users className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <h3
                      title={titleText}
                      className="text-xs font-semibold line-clamp-2 leading-tight text-[#0F1E36] group-hover:text-[#E25C47] transition-colors break-words"
                    >
                      {titleText}
                    </h3>
                    <span className="text-[10px] text-[#475569] font-medium flex-shrink-0 bg-[#F3EFE7] px-1.5 py-0.5 rounded">
                      {isAr ? topic.categoryAr : topic.categoryEn}
                    </span>
                  </div>
                  <p
                    title={descText}
                    className="text-[11px] text-[#5C6B88] leading-snug mt-1 break-words"
                  >
                    {descText}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Voice Script Assistant Box */}
      <div className="pt-4 border-t border-[#EAE3D9] space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[#0F1E36] flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-[#E25C47]" />
            <span>{isAr ? "مساعد تأليف النصوص الذكي:" : "AI Script Composer:"}</span>
          </label>
        </div>

        <div className="space-y-2.5">
          <div className="relative">
            <input
              id="input-ai-topic-prompt"
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                isAr
                  ? "اكتب فكرة سكريبت (مثال: إعلان ترويجي، قصة خيالية، مقدمة بودكاست)..."
                  : "Enter a script idea (e.g. promo commercial, fiction narration, podcast intro)..."
              }
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DED2] focus:bg-[#FFFDF9] focus:border-[#E25C47] focus:outline-none focus:ring-1 focus:ring-[#E25C47]/20 text-[#0F1E36] placeholder:text-[#95A3B8] transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!generating) {
                    handleGenerateScript();
                  }
                }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Format toggle: Speech vs Dialogue */}
            <div className="inline-flex items-center gap-1 bg-[#F3EFE7] p-0.5 rounded-lg border border-[#E5DED2]">
              <button
                type="button"
                id="btn-format-speech"
                onClick={() => setSelectedFormat("speech")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  selectedFormat === "speech"
                    ? "bg-[#FFFDF9] text-[#0F1E36] shadow-xs font-semibold"
                    : "text-[#5C6B88] hover:text-[#0F1E36]"
                }`}
              >
                {isAr ? "إلقاء فردي" : "Solo"}
              </button>
              <button
                type="button"
                id="btn-format-dialogue"
                onClick={() => setSelectedFormat("dialogue")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  selectedFormat === "dialogue"
                    ? "bg-[#FFFDF9] text-[#0F1E36] shadow-xs font-semibold"
                    : "text-[#5C6B88] hover:text-[#0F1E36]"
                }`}
              >
                {isAr ? "حوار ثنائي" : "Dialogue"}
              </button>
            </div>

            {/* Tone selector & Action */}
            <div className="flex items-center gap-1.5">
              <select
                id="select-script-tone"
                aria-label="Select voiceover tone"
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as any)}
                className="text-xs bg-[#FFFDF9] text-[#0F1E36] border border-[#E5DED2] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E25C47] focus:ring-1 focus:ring-[#E25C47]/20 cursor-pointer"
              >
                <option value="inspiring">{isAr ? "نبرة ملهمة" : "Inspiring"}</option>
                <option value="expert">{isAr ? "أسلوب رسمي" : "Authoritative"}</option>
                <option value="practical">{isAr ? "أسلوب وثائقي" : "Documentary"}</option>
                <option value="story">{isAr ? "سرد قصصي" : "Storytelling"}</option>
              </select>

              <button
                id="btn-generate-ai-script"
                type="button"
                onClick={handleGenerateScript}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#0F1E36] hover:bg-[#1E3050] text-[#FFFDF9] transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {isAr ? `جاري التأليف... (${elapsed}ث)` : `Writing... (${elapsed}s)`}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#E25C47]" />
                    <span>{isAr ? "تأليف النص" : "Compose"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {hasError && (
            <div
              role="alert"
              className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="leading-relaxed">
                  {isAr
                    ? "الخدمة مشغولة حالياً بسبب الضغط العالي، حاول مرة أخرى بعد لحظات."
                    : "The service is busy right now due to high demand. Please try again in a moment."}
                </span>
              </div>
              <button
                type="button"
                id="btn-retry-ai-script"
                onClick={handleGenerateScript}
                disabled={generating}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
                <span>{isAr ? "إعادة المحاولة" : "Retry"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
