import React from "react";
import { Play, Download, Trash2, Volume2 } from "lucide-react";
import { GeneratedAudioItem } from "../types";

interface LibraryDrawerProps {
  lang: "ar" | "en";
  items: GeneratedAudioItem[];
  activeId: string | null;
  onSelectTrack: (item: GeneratedAudioItem) => void;
  onDeleteTrack: (id: string) => void;
  onClearAll: () => void;
}

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  lang,
  items,
  activeId,
  onSelectTrack,
  onDeleteTrack,
  onClearAll,
}) => {
  const isAr = lang === "ar";

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 text-center shadow-[0_1px_3px_rgba(20,33,61,0.02)]">
        <h3 className="text-xs font-semibold text-[#5C6B88]">
          {isAr ? "سجل المقاطع الصوتية فارغ" : "Audio Library Empty"}
        </h3>
        <p className="text-[11px] text-[#475569] mt-1 font-medium">
          {isAr
            ? "المقاطع الصوتية التي تقوم بتوليدها في هذه الجلسة ستظهر هنا لإعادة تشغيلها وتحميلها"
            : "Generated audio tracks from this session will appear here for playback and download."}
        </p>
      </div>
    );
  }

  return (
    <div
      id="audio-library-card"
      className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 shadow-[0_1px_3px_rgba(20,33,61,0.03)] space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F3EFE7] flex items-center justify-center text-[#E25C47]">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold text-[#0F1E36]">
            {isAr ? `مكتبة التسجيلات (${items.length})` : `Audio Library (${items.length})`}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-[#475569] hover:text-[#E25C47] transition-colors cursor-pointer font-medium"
        >
          {isAr ? "مسح السجل" : "Clear"}
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.map((track) => {
          const isActive = track.id === activeId;
          return (
            <div
              key={track.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isActive
                  ? "bg-[#FDF3F1] border-[#E25C47] shadow-xs ring-1 ring-[#E25C47]/30"
                  : "bg-[#FAF7F2] border-[#E5DED2] hover:border-[#C4BCAD] hover:bg-[#F3EFE7]"
              }`}
            >
              <div
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                onClick={() => onSelectTrack(track)}
              >
                <button
                  type="button"
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${
                    isActive
                      ? "bg-[#E25C47] text-[#FFFDF9]"
                      : "bg-[#F3EFE7] text-[#0F1E36] hover:bg-[#EAE3D9]"
                  }`}
                  aria-label="Play track"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </button>

                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-[#0F1E36] truncate">{track.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-[#475569] mt-0.5 font-mono">
                    <span>{track.voice}</span>
                    <span>·</span>
                    <span>{new Date(track.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = track.audioUrl;
                    a.download = `${track.title.replace(/\s+/g, "_")}.wav`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#F3EFE7] text-[#5C6B88] hover:text-[#0F1E36] transition-colors cursor-pointer"
                  title={isAr ? "تحميل WAV" : "Download WAV"}
                  aria-label="Download WAV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTrack(track.id)}
                  className="p-1.5 rounded-lg hover:bg-[#FDF1EE] text-[#475569] hover:text-[#E25C47] transition-colors cursor-pointer"
                  title={isAr ? "حذف التسجيل" : "Delete Track"}
                  aria-label="Delete Track"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
