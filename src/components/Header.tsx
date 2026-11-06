import React, { useState } from "react";
import { Sparkles, Mic2, Globe, Radio, AudioLines, Share2, Check } from "lucide-react";

interface HeaderProps {
  lang: "ar" | "en";
  setLang: (lang: "ar" | "en") => void;
  onQuickPlayOpening: () => void;
}

export const Header: React.FC<HeaderProps> = ({ lang, setLang, onQuickPlayOpening }) => {
  const isAr = lang === "ar";
  const [shareCopied, setShareCopied] = useState(false);

  const handleShareApp = async () => {
    const shareData = {
      title: isAr ? "Sada iVoice | صَدَى – استوديو تحويل النصوص إلى صوت" : "Sada iVoice | صَدَى – Neural TTS Studio",
      text: isAr
        ? "استوديو صَدَى (Sada iVoice) لتحويل النصوص إلى مقاطع صوتية نقية بدقة 24kHz ونبرات متعددة بالذكاء الاصطناعي"
        : "Sada iVoice Studio for high-fidelity 24kHz neural speech synthesis",
      url: "https://sada-ivoice.ai.studio/",
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText("https://sada-ivoice.ai.studio/");
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <header id="app-header" className="border-b border-[#EAE3D9] bg-[#FFFDF9]/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F1E36] text-[#F7F4EE] flex items-center justify-center shadow-xs flex-shrink-0">
            <Mic2 className="w-4 h-4 text-[#F7F4EE] stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#0F1E36] flex items-center gap-2">
                <span
                  style={{ backgroundColor: "#b7d9e7" }}
                  className="px-2 py-0.5 rounded-md text-[#0F1E36] font-extrabold inline-block text-sm sm:text-base"
                >
                  {isAr ? "صَدَى" : "Sada"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#F3EFE7] text-[#44546F] border border-[#E5DED2] font-medium flex items-center gap-1">
                  <AudioLines className="w-3 h-3 text-[#E25C47]" />
                  <span>iVoice</span>
                </span>
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-[#5C6B88] hidden sm:block">
              {isAr
                ? "استوديو تحويل النصوص إلى صوت طبيعي بدقة 24kHz"
                : "Neural Text-to-Speech Studio & Voice Synthesis"}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Play Intro Button */}
          <button
            id="btn-quick-opening"
            onClick={onQuickPlayOpening}
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#F3EFE7] hover:bg-[#EAE3D9] text-[#0F1E36] border border-[#E5DED2] transition-colors cursor-pointer"
            title={isAr ? "تحميل الافتتاحية التجريبية" : "Load Welcome Sample"}
          >
            <Radio className="w-3.5 h-3.5 text-[#E25C47]" />
            <span>{isAr ? "نص تجريبي" : "Load Sample"}</span>
          </button>

          {/* Model indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F3EFE7] text-[#5C6B88] text-xs border border-[#E5DED2]">
            <Sparkles className="w-3 h-3 text-[#E25C47]" />
            <span className="font-mono text-[11px] text-[#44546F]">Gemini Flash TTS</span>
          </div>

          {/* Language toggle */}
          <button
            id="btn-language-toggle"
            onClick={() => setLang(isAr ? "en" : "ar")}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#F3EFE7] text-[#0F1E36] border border-[#E5DED2] shadow-xs transition-colors cursor-pointer"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-[#5C6B88]" />
            <span>{isAr ? "English" : "العربية"}</span>
          </button>

          {/* Share App Link Button */}
          <button
            id="btn-share-app"
            onClick={handleShareApp}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#F3EFE7] text-[#0F1E36] border border-[#E5DED2] shadow-xs transition-colors cursor-pointer"
            title={isAr ? "مشاركة رابط التطبيق" : "Share App Link"}
            aria-label="Share App"
          >
            {shareCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">{isAr ? "تم النسخ!" : "Copied!"}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#E25C47]" />
                <span className="hidden sm:inline">{isAr ? "مشاركة" : "Share"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
