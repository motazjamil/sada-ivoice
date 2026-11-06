import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Users,
  User,
  Trash2,
  ClipboardPaste,
  RefreshCw,
  FileText,
  AlertCircle,
  SlidersHorizontal,
  X,
  Gauge,
  Check,
} from "lucide-react";
import { AVAILABLE_VOICES } from "../data/voices";
import { GeneratedAudioItem } from "../types";
import { convertPcmBase64ToWavUrl } from "../utils/audioUtils";
import { PRESET_TOPICS } from "../data/topics";

interface SpeechStudioProps {
  lang: "ar" | "en";
  text: string;
  setText: (text: string) => void;
  title?: string;
  setTitle?: (title: string) => void;
  presetMeta?: { title: string; text: string } | null;
  setPresetMeta?: (meta: { title: string; text: string } | null) => void;
  isDialogue: boolean;
  setIsDialogue: (isDialogue: boolean) => void;
  speaker1: string;
  setSpeaker1: (s: string) => void;
  speaker2: string;
  setSpeaker2: (s: string) => void;
  voice1?: string;
  setVoice1?: (v: string) => void;
  voice2?: string;
  setVoice2?: (v: string) => void;
  onAudioGenerated: (item: GeneratedAudioItem) => void;
  existingAudioItems?: GeneratedAudioItem[];
  onSelectExistingTrack?: (item: GeneratedAudioItem) => void;
}

export const SpeechStudio: React.FC<SpeechStudioProps> = ({
  lang,
  text,
  setText,
  title,
  setTitle,
  presetMeta,
  setPresetMeta,
  isDialogue,
  setIsDialogue,
  speaker1,
  setSpeaker1,
  speaker2,
  setSpeaker2,
  voice1: voice1Prop,
  setVoice1: setVoice1Prop,
  voice2: voice2Prop,
  setVoice2: setVoice2Prop,
  onAudioGenerated,
  existingAudioItems,
  onSelectExistingTrack,
}) => {
  const isAr = lang === "ar";

  // Voice Selection State (Puck for male Speaker 1, Kore for female Speaker 2)
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [internalVoice1, setInternalVoice1] = useState("Puck");
  const [internalVoice2, setInternalVoice2] = useState("Kore");

  const activeVoice1 = voice1Prop ?? internalVoice1;
  const setVoice1 = setVoice1Prop ?? setInternalVoice1;
  const activeVoice2 = voice2Prop ?? internalVoice2;
  const setVoice2 = setVoice2Prop ?? setInternalVoice2;

  const voice1Obj = AVAILABLE_VOICES.find((v) => v.id === activeVoice1);
  const voice2Obj = AVAILABLE_VOICES.find((v) => v.id === activeVoice2);
  const voice1Gender = voice1Obj?.gender || "male";
  const voice2Gender = voice2Obj?.gender || "female";
  const [selectedStyle, setSelectedStyle] = useState(
    "Say naturally with captivating cadence, clean pacing, and clear conversational inflection"
  );
  const [speakingRate, setSpeakingRate] = useState<"slow" | "normal" | "fast">("normal");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [showLimitHint, setShowLimitHint] = useState<boolean>(false);

  const MAX_CHARS = 2000;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Automatically hide limit reached hint banner as soon as text character count drops below 2,000
  useEffect(() => {
    if (text.length < MAX_CHARS && showLimitHint) {
      setShowLimitHint(false);
    }
  }, [text, showLimitHint, MAX_CHARS]);

  // Clean up any active timer or abort controller on unmount
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

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSynthesizing(false);
    setElapsedSeconds(0);
    // User's text remains intact!
  };

  const stylePresets = [
    {
      id: "natural",
      labelAr: "طبيعي ومتزن",
      labelEn: "Natural & Balanced",
      prompt: "Say naturally with captivating cadence, clean pacing, and clear conversational inflection",
    },
    {
      id: "podcast",
      labelAr: "بودكاست إذاعي",
      labelEn: "Podcast & Broadcast",
      prompt: "Say in a warm, captivating, and engaging broadcast radio podcast inflection",
    },
    {
      id: "story",
      labelAr: "سرد قصصي وروايات",
      labelEn: "Storytelling & Narration",
      prompt: "Say in an expressive, immersive, warm, and atmospheric storytelling narration style",
    },
    {
      id: "keynote",
      labelAr: "إلقاء قيادي وحماسي",
      labelEn: "Inspiring Keynote",
      prompt: "Say enthusiastically with high energy, confidence, and authority as an inspiring keynote speaker",
    },
    {
      id: "commercial",
      labelAr: "إعلانات وترويج",
      labelEn: "Commercial Promo",
      prompt: "Say in a crisp, dynamic, punchy, persuasive, and appealing commercial promo style",
    },
  ];

  const speakingRateInstructions = {
    slow: "Speak slowly and clearly with measured, relaxed articulation",
    normal: "Speak at a natural, balanced, conversational pace",
    fast: "Speak quickly and energetically with dynamic, lively cadence",
  };

  const handleSynthesize = async () => {
    // Prevent duplicate requests while generation is running
    if (isSynthesizing) return;

    const trimmedText = text.trim();
    if (!trimmedText) {
      setErrorMessage(
        isAr
          ? "يرجى كتابة نص في المساحة المخصصة قبل التحويل الصوتي."
          : "Please enter or paste your text before generating audio."
      );
      return;
    }

    // SECTION 2: Compute cache key before calling API and check Audio Library
    const cacheKey = [
      trimmedText,
      isDialogue ? "multi" : "single",
      isDialogue ? `${activeVoice1}__${activeVoice2}__${speaker1}__${speaker2}` : selectedVoice,
      selectedStyle,
      speakingRate,
    ].join("::");

    const cachedItem = (existingAudioItems || []).find((item) => item.cacheKey === cacheKey);
    if (cachedItem) {
      if (onSelectExistingTrack) {
        onSelectExistingTrack(cachedItem);
      }
      setCacheNotice(
        isAr ? "تم التحميل من مكتبتك" : "Loaded from your library"
      );
      setTimeout(() => setCacheNotice(null), 4000);
      return;
    }

    setIsSynthesizing(true);
    setErrorMessage(null);
    setElapsedSeconds(0);

    // Start elapsed-seconds counter
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    timerRef.current = timer;

    // Set up AbortController for cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const effectiveStyle = `${speakingRateInstructions[speakingRate]}. ${selectedStyle}`;
      const payload = {
        text: trimmedText,
        mode: isDialogue ? "multi" : "single",
        voice: selectedVoice,
        stylePrompt: effectiveStyle,
        speaker1: speaker1 || (isAr ? "المتحدث 1" : "Motaz"),
        speaker2: speaker2 || (isAr ? "المتحدث 2" : "Sara"),
        voice1: activeVoice1,
        voice2: activeVoice2,
      };

      const res = await fetch("/api/tts", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate speech with Gemini TTS.");
      }

      if (!data.audioBase64) {
        throw new Error("No audio payload returned from Gemini TTS.");
      }

      // Convert PCM base64 to standard WAV blob URL
      const wavUrl = convertPcmBase64ToWavUrl(data.audioBase64, data.sampleRate || 24000);

      // At the moment generation starts, create the track's title from the current input:
      // if a template/preset is selected use its name; otherwise use the first 6 words of the current text (appending "…" only if truncated)
      const createTrackTitle = (): string => {
        // 1. If an active preset was selected and current input matches that preset
        if (presetMeta && presetMeta.text.trim() === trimmedText && presetMeta.title.trim()) {
          return presetMeta.title.trim();
        }

        // 2. If a title was passed explicitly (e.g. from composer) and text matches
        if (title && title.trim()) {
          return title.trim();
        }

        // 3. Check if current text exactly matches any known preset in PRESET_TOPICS
        const matched = PRESET_TOPICS.find(
          (p) => p.defaultTextAr.trim() === trimmedText || p.defaultTextEn.trim() === trimmedText
        );
        if (matched) {
          return isAr ? matched.titleAr : matched.titleEn;
        }

        // 4. Otherwise: use the first 6 words. Append "…" ONLY when the title was actually truncated!
        const words = trimmedText.split(/\s+/).filter(Boolean);
        if (words.length > 6) {
          return words.slice(0, 6).join(" ") + "…";
        }
        return words.join(" ");
      };

      const resolvedTitle = createTrackTitle();

      // Clear any active preset selection now that this track's generation has been sealed
      if (setPresetMeta) {
        setPresetMeta(null);
      }
      if (setTitle) {
        setTitle("");
      }

      const newItem: GeneratedAudioItem = {
        id: `speech-${Date.now()}`,
        title: resolvedTitle,
        text: trimmedText,
        audioUrl: wavUrl,
        rawBase64: data.audioBase64,
        createdAt: new Date().toISOString(),
        voice: isDialogue ? `${activeVoice1} & ${activeVoice2}` : selectedVoice,
        isMultiSpeaker: isDialogue,
        speaker1,
        speaker2,
        voice1: activeVoice1,
        voice2: activeVoice2,
        cacheKey,
        speakingRate,
        stylePrompt: selectedStyle,
      };

      onAudioGenerated(newItem);
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        // Cancelled by user - reset silently without showing error message
        return;
      }
      console.error("TTS Synthesis Error:", err);
      setErrorMessage(
        err.message ||
          (isAr
            ? "تعذر توليد المقطع الصوتي، يرجى المحاولة مرة أخرى."
            : "An unexpected error occurred during audio synthesis.")
      );
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      abortControllerRef.current = null;
      setIsSynthesizing(false);
      setElapsedSeconds(0);
    }
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        if (clipText.length > MAX_CHARS) {
          setText(clipText.slice(0, MAX_CHARS));
          setShowLimitHint(true);
        } else {
          setText(clipText);
          setShowLimitHint(false);
        }
        if (setPresetMeta) setPresetMeta(null);
        if (setTitle) setTitle("");
      }
    } catch (err) {
      console.error("Clipboard paste error:", err);
    }
  };

  const handleLoadSample = () => {
    const sampleText = isAr
      ? "أهلاً بكم في صَدَى، الاستوديو الاحترافي لتحويل النصوص إلى أصوات بشرية طبيعية وواقعية. نعتمد على أحدث نماذج الذكاء الاصطناعي لإنتاج صوت نقي بدقة 24kHz ونبرات إلقاء تلامس الأسماع."
      : "Welcome to Sada, the neural audio studio engineered to transform written words into lifelike, expressive speech with 24kHz high fidelity. Type or paste your script to experience natural voice synthesis.";
    const sampleTitle = isAr ? "مرحباً بكم في استوديو صَدَى" : "Welcome to Sada Studio";
    setText(sampleText);
    if (setPresetMeta) {
      setPresetMeta({ title: sampleTitle, text: sampleText });
    }
    if (setTitle) {
      setTitle(sampleTitle);
    }
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div
      id="speech-studio-card"
      className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 sm:p-7 shadow-[0_1px_3px_rgba(20,33,61,0.04)] space-y-6"
    >
      {/* 1. VISUAL PRIORITY: TEXT INPUT AREA */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#0F1E36] tracking-tight">
              {isAr ? "نص التحويل الصوتي" : "Text to Synthesize"}
            </span>
            <span className="text-xs text-[#5C6B88] hidden sm:inline">
              · {isAr ? "يدعم العربية والإنجليزية وأكثر من 20 لغة" : "Supports Arabic, English & 20+ languages"}
            </span>
          </div>

          {/* Quick Text Utility Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-sample-text"
              onClick={handleLoadSample}
              className="text-xs font-medium flex items-center gap-1 text-[#44546F] hover:text-[#0F1E36] px-2.5 py-1 rounded-md hover:bg-[#F3EFE7] transition-colors cursor-pointer"
              title={isAr ? "تحميل نص تجريبي" : "Load sample text"}
            >
              <FileText className="w-3.5 h-3.5 text-[#5C6B88]" />
              <span>{isAr ? "نص تجريبي" : "Sample"}</span>
            </button>

            <button
              type="button"
              id="btn-paste-clipboard"
              onClick={handlePaste}
              className="text-xs font-medium flex items-center gap-1 text-[#44546F] hover:text-[#0F1E36] px-2.5 py-1 rounded-md hover:bg-[#F3EFE7] transition-colors cursor-pointer"
              title={isAr ? "لصق من الحافظة" : "Paste from clipboard"}
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-[#5C6B88]" />
              <span>{isAr ? "لصق" : "Paste"}</span>
            </button>

            {text && (
              <button
                type="button"
                id="btn-clear-text"
                onClick={() => {
                  setText("");
                  if (setPresetMeta) setPresetMeta(null);
                  if (setTitle) setTitle("");
                }}
                className="text-xs font-medium flex items-center gap-1 text-[#475569] hover:text-[#E25C47] px-2 py-1 rounded-md hover:bg-[#FDF1EE] transition-colors cursor-pointer"
                title={isAr ? "مسح النص" : "Clear text"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isAr ? "مسح" : "Clear"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Real Editable Textarea with Warm Ivory Surface, Deep Editorial Blue Text, and Coral Orange Focus Accent */}
        <div className="relative">
          <textarea
            id="speech-text-input"
            rows={7}
            maxLength={MAX_CHARS}
            value={text}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length >= MAX_CHARS) {
                setText(val.slice(0, MAX_CHARS));
                setShowLimitHint(true);
              } else {
                setText(val);
                setShowLimitHint(false);
              }
              if (presetMeta && val.trim() !== presetMeta.text.trim()) {
                if (setPresetMeta) setPresetMeta(null);
                if (setTitle) setTitle("");
              }
            }}
            placeholder={
              isAr
                ? "اكتب أو الصق النص هنا..."
                : "Type or paste your text here..."
            }
            className="w-full text-base sm:text-[15px] leading-relaxed p-4 sm:p-5 rounded-xl bg-[#FAF7F2] border border-[#E5DED2] text-[#0F1E36] placeholder:text-[#95A3B8] focus:bg-[#FFFDF9] focus:border-[#E25C47] focus:outline-none focus:ring-2 focus:ring-[#E25C47]/20 transition-all font-sans resize-y shadow-inner"
            dir={isAr ? "rtl" : "ltr"}
            aria-label={isAr ? "مساحة إدخال النص للتحويل الصوتي" : "Text input for speech synthesis"}
          />

          {/* Limit Reached Notice: only visible when limit is reached AND user has not dismissed */}
          {showLimitHint && charCount >= MAX_CHARS && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">
                  {isAr
                    ? "وصلت للحد الأقصى 2,000 حرف — اختصر النص أو قسّمه إلى أجزاء"
                    : "You reached the 2,000-character limit — shorten the text or split it into parts."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLimitHint(false)}
                className="text-amber-700 hover:text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Cache Notice */}
          {cacheNotice && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{cacheNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCacheNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Character & Word Counter */}
          <div className="flex items-center justify-between text-xs px-1 pt-1.5 font-medium">
            <span
              className={`font-mono tabular-nums ${
                charCount >= MAX_CHARS
                  ? "text-rose-600 font-bold"
                  : charCount >= 1800
                  ? "text-amber-600 font-bold"
                  : "text-[#475569]"
              }`}
            >
              {charCount} / 2,000 {isAr ? "حرف" : "characters"} · {wordCount} {isAr ? "كلمة" : "words"}
            </span>
            <span className="text-[11px] text-[#475569] hidden sm:inline font-mono">
              Gemini Flash TTS · 24kHz
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#EAE3D9]" />

      {/* 2. VOICE CONTROLS & ACTOR SELECTION */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#5C6B88] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#5C6B88]" />
            <span>{isAr ? "إعدادات الصوت والممثلين" : "Voice Actors & Mode"}</span>
          </label>

          {/* Single vs Dialogue Segmented Switch */}
          <div className="inline-flex items-center bg-[#F3EFE7] p-0.5 rounded-lg border border-[#E5DED2]">
            <button
              type="button"
              id="btn-mode-single"
              onClick={() => setIsDialogue(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                !isDialogue
                  ? "bg-[#FFFDF9] text-[#0F1E36] shadow-xs font-semibold"
                  : "text-[#5C6B88] hover:text-[#0F1E36]"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isAr ? "صوت منفرد" : "Single Voice"}</span>
            </button>
            <button
              type="button"
              id="btn-mode-multi"
              onClick={() => setIsDialogue(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                isDialogue
                  ? "bg-[#FFFDF9] text-[#0F1E36] shadow-xs font-semibold"
                  : "text-[#5C6B88] hover:text-[#0F1E36]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isAr ? "حوار ثنائي" : "Two Speakers"}</span>
            </button>
          </div>
        </div>

        {/* Voice Selection Options */}
        {!isDialogue ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {AVAILABLE_VOICES.map((v) => {
                const isSelected = selectedVoice === v.id;
                const toneDesc = isAr ? v.toneAr : v.toneEn;
                return (
                  <button
                    key={v.id}
                    id={`voice-option-${v.id}`}
                    type="button"
                    title={`${v.name}: ${toneDesc}`}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between h-full min-h-[82px] ${
                      isSelected
                        ? "bg-[#FDF3F1] border-[#E25C47] text-[#0F1E36] shadow-xs ring-1 ring-[#E25C47]/40"
                        : "bg-[#FFFDF9] border-[#E5DED2] text-[#0F1E36] hover:border-[#C4BCAD] hover:bg-[#FAF7F2]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5 w-full">
                      <span className="text-xs font-bold font-mono tracking-tight text-[#0F1E36]">
                        {v.name}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-mono px-1 py-0.2 rounded shrink-0 ${
                          isSelected
                            ? "bg-[#E25C47]/15 text-[#E25C47] font-semibold"
                            : "bg-[#F3EFE7] text-[#5C6B88]"
                        }`}
                      >
                        {isAr ? (v.gender === "female" ? "أنثى" : "ذكر") : v.gender}
                      </span>
                    </div>
                    <span
                      title={toneDesc}
                      className="text-[11px] leading-snug line-clamp-2 text-[#5C6B88] w-full"
                    >
                      {toneDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#FAF7F2] p-4 rounded-xl border border-[#E5DED2]">
            {/* Speaker 1 Config */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F1E36] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#5C6B88]" />
                <span>{isAr ? "المتحدث الأول (الاسم والصوت):" : "Speaker 1 (Name & Voice):"}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={speaker1}
                  onChange={(e) => setSpeaker1(e.target.value)}
                  placeholder={isAr ? "معتز" : "Motaz"}
                  className="w-5/12 text-xs px-2.5 py-2 rounded-lg bg-[#FFFDF9] border border-[#E5DED2] text-[#0F1E36] focus:outline-none focus:border-[#E25C47] focus:ring-1 focus:ring-[#E25C47]/20"
                />
                <div className="w-7/12 flex items-center gap-1.5 min-w-0">
                  <select
                    value={activeVoice1}
                    onChange={(e) => setVoice1(e.target.value)}
                    aria-label={isAr ? "اختيار صوت المتحدث الأول" : "Select voice for Speaker 1"}
                    className="flex-1 min-w-0 text-xs bg-[#FFFDF9] text-[#0F1E36] border border-[#E5DED2] rounded-lg px-2 py-2 focus:outline-none focus:border-[#E25C47] focus:ring-1 focus:ring-[#E25C47]/20"
                  >
                    {AVAILABLE_VOICES.map((v) => (
                      <option key={`spk1-${v.id}`} value={v.id}>
                        {v.name} ({isAr ? (v.gender === "female" ? "أنثى" : "ذكر") : (v.gender === "female" ? "Female" : "Male")})
                      </option>
                    ))}
                  </select>
                  <span
                    className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-semibold border ${
                      voice1Gender === "female"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                    title={isAr ? (voice1Gender === "male" ? "صوت ذكر" : "صوت أنثى") : (voice1Gender === "male" ? "Male Voice" : "Female Voice")}
                  >
                    {isAr ? (voice1Gender === "male" ? "ذكر" : "أنثى") : (voice1Gender === "male" ? "Male" : "Female")}
                  </span>
                </div>
              </div>
            </div>

            {/* Speaker 2 Config */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F1E36] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#5C6B88]" />
                <span>{isAr ? "المتحدث الثاني (الاسم والصوت):" : "Speaker 2 (Name & Voice):"}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={speaker2}
                  onChange={(e) => setSpeaker2(e.target.value)}
                  placeholder={isAr ? "سارة" : "Sara"}
                  className="w-5/12 text-xs px-2.5 py-2 rounded-lg bg-[#FFFDF9] border border-[#E5DED2] text-[#0F1E36] focus:outline-none focus:border-[#E25C47] focus:ring-1 focus:ring-[#E25C47]/20"
                />
                <div className="w-7/12 flex items-center gap-1.5 min-w-0">
                  <select
                    value={activeVoice2}
                    onChange={(e) => setVoice2(e.target.value)}
                    aria-label={isAr ? "اختيار صوت المتحدث الثاني" : "Select voice for Speaker 2"}
                    className="flex-1 min-w-0 text-xs bg-[#FFFDF9] text-[#0F1E36] border border-[#E5DED2] rounded-lg px-2 py-2 focus:outline-none focus:border-[#E25C47] focus:ring-1 focus:ring-[#E25C47]/20"
                  >
                    {AVAILABLE_VOICES.map((v) => (
                      <option key={`spk2-${v.id}`} value={v.id}>
                        {v.name} ({isAr ? (v.gender === "female" ? "أنثى" : "ذكر") : (v.gender === "female" ? "Female" : "Male")})
                      </option>
                    ))}
                  </select>
                  <span
                    className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-semibold border ${
                      voice2Gender === "female"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                    title={isAr ? (voice2Gender === "male" ? "صوت ذكر" : "صوت أنثى") : (voice2Gender === "male" ? "Male Voice" : "Female Voice")}
                  >
                    {isAr ? (voice2Gender === "male" ? "ذكر" : "أنثى") : (voice2Gender === "male" ? "Male" : "Female")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-[#EAE3D9]" />

      {/* 3. VOCAL TONE & DELIVERY STYLE + SPEAKING RATE */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#5C6B88] flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#5C6B88]" />
            <span>{isAr ? "نبرة وأسلوب الإلقاء الصوتي:" : "Vocal Delivery Style:"}</span>
          </label>

          {/* SECTION 4: Speaking Rate Selector (Slow / Normal / Fast) */}
          <div className="inline-flex items-center gap-1 bg-[#F3EFE7] p-0.5 rounded-lg border border-[#E5DED2]">
            <span className="text-[10px] font-semibold text-[#5C6B88] px-1.5 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-[#E25C47]" />
              {isAr ? "سرعة الإلقاء:" : "Pace:"}
            </span>
            <button
              type="button"
              id="btn-rate-slow"
              onClick={() => setSpeakingRate("slow")}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                speakingRate === "slow"
                  ? "bg-[#FFFDF9] text-[#0F1E36] shadow-xs font-semibold"
                  : "text-[#5C6B88] hover:text-[#0F1E36]"
              }`}
            >
              {isAr ? "بطيء" : "Slow"}
            </button>
            <button
              type="button"
              id="btn-rate-normal"
              onClick={() => setSpeakingRate("normal")}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                speakingRate === "normal"
                  ? "bg-[#FFFDF9] text-[#0F1E36] shadow-xs font-semibold"
                  : "text-[#5C6B88] hover:text-[#0F1E36]"
              }`}
            >
              {isAr ? "عادي" : "Normal"}
            </button>
            <button
              type="button"
              id="btn-rate-fast"
              onClick={() => setSpeakingRate("fast")}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                speakingRate === "fast"
                  ? "bg-[#FFFDF9] text-[#0F1E36] shadow-xs font-semibold"
                  : "text-[#5C6B88] hover:text-[#0F1E36]"
              }`}
            >
              {isAr ? "سريع" : "Fast"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {stylePresets.map((st) => (
            <button
              key={st.id}
              type="button"
              id={`style-preset-${st.id}`}
              onClick={() => setSelectedStyle(st.prompt)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                selectedStyle === st.prompt
                  ? "bg-[#0F1E36] text-[#FFFDF9] border-[#0F1E36] font-medium shadow-xs"
                  : "bg-[#F3EFE7] border-[#E5DED2] text-[#44546F] hover:text-[#0F1E36] hover:bg-[#EAE3D9]"
              }`}
            >
              {isAr ? st.labelAr : st.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. PRIMARY CONVERSION ACTION — CORAL ORANGE */}
      <div className="space-y-2.5">
        {!isSynthesizing ? (
          <button
            id="btn-synthesize-tts"
            type="button"
            onClick={handleSynthesize}
            disabled={isSynthesizing || !text.trim() || charCount > MAX_CHARS}
            className="w-full py-3.5 px-6 rounded-xl bg-[#E25C47] hover:bg-[#D04F3B] active:bg-[#BF4330] text-[#FFFDF9] font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Volume2 className="w-4 h-4 text-[#FFFDF9]" />
            <span>
              {isAr ? "تحويل النص إلى صوت الآن" : "Convert Text to Speech"}
            </span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                id="btn-synthesize-tts"
                type="button"
                disabled={true}
                className="flex-1 py-3 px-4 rounded-xl bg-[#E25C47] text-[#FFFDF9] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-not-allowed opacity-95"
              >
                <RefreshCw className="w-4 h-4 animate-spin text-[#FFFDF9] shrink-0" />
                <span className="truncate">
                  {isAr ? "جاري توليد الصوت بدقة 24kHz..." : "Generating 24kHz audio..."}
                </span>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-black/20 text-xs font-mono font-bold tracking-tight">
                  {isAr ? `${elapsedSeconds}ث` : `${elapsedSeconds}s`}
                </span>
              </button>

              <button
                id="btn-cancel-tts"
                type="button"
                onClick={handleCancel}
                className="shrink-0 py-3 px-4 sm:px-5 rounded-xl border border-[#E5DED2] bg-[#FAF7F2] hover:bg-[#F3EFE7] active:bg-[#EAE3D9] text-[#0F1E36] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <X className="w-4 h-4 text-[#5C6B88]" />
                <span>{isAr ? "إلغاء" : "Cancel"}</span>
              </button>
            </div>

            {/* Live animated progress bar */}
            <div className="w-full h-1.5 bg-[#EAE3D9] rounded-full overflow-hidden">
              <div className="h-full bg-[#E25C47] rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
