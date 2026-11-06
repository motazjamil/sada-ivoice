import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Repeat,
  Radio,
} from "lucide-react";
import { GeneratedAudioItem } from "../types";
import {
  formatAudioDuration,
  convertPcmBase64ToMp3Blob,
  generateAudioFilename,
} from "../utils/audioUtils";

interface AudioPlayerProps {
  currentAudio: GeneratedAudioItem | null;
  lang: "ar" | "en";
  onReplay?: () => void;
}

// Extract real amplitude peaks from raw 16-bit PCM base64 payload
function extractPeaksFromPcmBase64(base64: string, numBars = 56): number[] {
  try {
    const binary = window.atob(base64);
    const byteLen = binary.length;
    const sampleCount = Math.floor(byteLen / 2);
    if (sampleCount <= 0) return [];

    const samplesPerBar = Math.floor(sampleCount / numBars);
    if (samplesPerBar <= 0) return [];

    const peaks: number[] = [];
    for (let bar = 0; bar < numBars; bar++) {
      let maxAmp = 0;
      const startSample = bar * samplesPerBar;
      const endSample = Math.min(startSample + samplesPerBar, sampleCount);

      // Sample every 4th entry for high performance
      for (let s = startSample; s < endSample; s += 4) {
        const byteOffset = s * 2;
        const low = binary.charCodeAt(byteOffset);
        const high = binary.charCodeAt(byteOffset + 1);
        let val = (high << 8) | low;
        if (val >= 0x8000) val -= 0x10000;
        const amp = Math.abs(val);
        if (amp > maxAmp) maxAmp = amp;
      }
      peaks.push(maxAmp / 32768);
    }

    const maxVal = Math.max(...peaks, 0.05);
    return peaks.map((p) => Math.max(0.14, Math.min(0.96, p / maxVal)));
  } catch (e) {
    console.warn("PCM peak extraction failed:", e);
    return [];
  }
}

// Extract real amplitude peaks from audio URL using Web Audio API decoding
async function extractPeaksFromAudioUrl(
  audioUrl: string,
  numBars = 56
): Promise<{ peaks: number[]; duration: number } | null> {
  try {
    const res = await fetch(audioUrl);
    const arrayBuffer = await res.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const sampleCount = channelData.length;
    const samplesPerBar = Math.floor(sampleCount / numBars);
    if (samplesPerBar <= 0) {
      ctx.close().catch(() => {});
      return null;
    }

    const peaks: number[] = [];
    for (let bar = 0; bar < numBars; bar++) {
      let maxAmp = 0;
      const startSample = bar * samplesPerBar;
      const endSample = Math.min(startSample + samplesPerBar, sampleCount);
      for (let s = startSample; s < endSample; s += 4) {
        const amp = Math.abs(channelData[s]);
        if (amp > maxAmp) maxAmp = amp;
      }
      peaks.push(maxAmp);
    }

    const maxVal = Math.max(...peaks, 0.05);
    const normalized = peaks.map((p) => Math.max(0.14, Math.min(0.96, p / maxVal)));
    const dur = audioBuffer.duration;
    ctx.close().catch(() => {});
    return { peaks: normalized, duration: dur };
  } catch (err) {
    console.warn("AudioUrl waveform extraction failed:", err);
    return null;
  }
}

// Generate organic baseline waveform if audio decoding is pending
function generateFallbackPeaks(numBars = 56): number[] {
  const p: number[] = [];
  for (let i = 0; i < numBars; i++) {
    const x = i / numBars;
    const val = 0.25 + 0.45 * Math.sin(x * Math.PI) + 0.18 * Math.sin(x * 14 + 1.2);
    p.push(Math.max(0.16, Math.min(0.9, Math.abs(val))));
  }
  return p;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ currentAudio, lang, onReplay }) => {
  const isAr = lang === "ar";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);

  // SECTION 1: Auto-play after generation (default false/OFF, persisted in localStorage)
  const [autoPlayAfterGen, setAutoPlayAfterGen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sada_auto_play_after_gen");
      return saved === "true"; // default is false (OFF)
    } catch {
      return false;
    }
  });

  const handleToggleAutoPlay = () => {
    setAutoPlayAfterGen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sada_auto_play_after_gen", String(next));
      } catch {}
      return next;
    });
  };

  // When a new track is generated or selected: reset to 00:00 and load duration & waveform
  useEffect(() => {
    // SECTION 1: Fully stop and reset any previous audio elements so two tracks can never overlap
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    document.querySelectorAll("audio").forEach((el) => {
      if (el !== audioEl) {
        el.pause();
        el.currentTime = 0;
      }
    });

    if (!currentAudio) {
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setPeaks([]);
      return;
    }

    // 1. Reset state to 00:00 immediately, showing the Play button
    setCurrentTime(0);
    setIsPlaying(false);

    // 2. Extract initial peaks and calculate duration from PCM base64 if present
    if (currentAudio.rawBase64) {
      const extracted = extractPeaksFromPcmBase64(currentAudio.rawBase64, 56);
      if (extracted.length > 0) {
        setPeaks(extracted);
      }
      try {
        const byteLen = window.atob(currentAudio.rawBase64).length;
        const dur = (byteLen / 2) / 24000;
        if (dur > 0 && isFinite(dur)) {
          setDuration(dur);
        }
      } catch (e) {
        console.warn("Could not calculate PCM duration:", e);
      }
    }

    // 3. Decode via Web Audio API for precise audio buffer duration and peaks
    if (currentAudio.audioUrl) {
      extractPeaksFromAudioUrl(currentAudio.audioUrl, 56).then((res) => {
        if (res) {
          if (res.peaks && res.peaks.length > 0) {
            setPeaks(res.peaks);
          }
          if (res.duration > 0 && isFinite(res.duration)) {
            setDuration(res.duration);
          }
        }
      });
    }

    // 4. Configure audio element with track source (ready at 00:00 with Play button shown)
    if (audioEl && currentAudio.audioUrl) {
      audioEl.src = currentAudio.audioUrl;
      audioEl.currentTime = 0;
      audioEl.playbackRate = playbackRate;
      audioEl.load();

      // Only auto-play if user explicitly enabled the toggle
      if (autoPlayAfterGen) {
        audioEl
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Auto-play prevented by browser policy:", err);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentAudio]);

  // Audio Event Handlers
  const handleLoadedMetadata = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const d = audioEl.duration;
    if (isFinite(d) && d > 0) {
      setDuration(d);
    }
  };

  const handleDurationChange = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const d = audioEl.duration;
    if (isFinite(d) && d > 0) {
      setDuration(d);
    }
  };

  const handleTimeUpdate = () => {
    const audioEl = audioRef.current;
    if (!audioEl || isSeeking) return;
    setCurrentTime(audioEl.currentTime);
  };

  const handleEnded = () => {
    if (isLooping && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      if (duration > 0) {
        setCurrentTime(duration);
      }
    }
  };

  // Draw Audio Waveform on Canvas with Deep Editorial Blue & Coral Orange accents
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width || 400;
    const displayHeight = rect.height || 48;

    // Crisp high-DPI scaling
    const targetW = Math.floor(displayWidth * dpr);
    const targetH = Math.floor(displayHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const numBars = 56;
    let barPeaks = peaks;
    if (!barPeaks || barPeaks.length === 0) {
      barPeaks = generateFallbackPeaks(numBars);
    }

    const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    const currentBarIndex = Math.floor(progress * numBars);

    const barGap = 2.5;
    const totalGaps = (numBars - 1) * barGap;
    const barWidth = Math.max(2, (displayWidth - totalGaps) / numBars);

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + barGap);
      let peakValue = barPeaks[i % barPeaks.length] || 0.2;

      // Real-time equalizer pulse at current playhead while playing
      if (isPlaying && Math.abs(i - currentBarIndex) <= 2) {
        const pulse = Math.sin(Date.now() * 0.015 + i) * 0.12;
        peakValue = Math.min(0.95, Math.max(0.2, peakValue + pulse));
      }

      const barHeight = Math.max(4, peakValue * displayHeight * 0.85);
      const y = (displayHeight - barHeight) / 2;

      const isPlayed = i <= currentBarIndex;

      if (isPlayed) {
        // Highlighted played portion with Coral Orange gradient
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, "#E25C47"); // Coral Orange
        grad.addColorStop(1, "#D04F3B"); // Warm accent
        ctx.fillStyle = grad;
      } else {
        // Unplayed portion with clean subtle warm tone matching palette
        ctx.fillStyle = "#D6CFC3";
      }

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, barWidth, barHeight, 2);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }

    ctx.restore();
  }, [peaks, currentTime, duration, isPlaying]);

  // Waveform render loop during playback & when seeking
  useEffect(() => {
    let animId: number;

    const loop = () => {
      drawWaveform();
      if (isPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };

    loop();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [drawWaveform, isPlaying]);

  // Window resize listener to keep canvas crisp
  useEffect(() => {
    const handleResize = () => drawWaveform();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawWaveform]);

  // Play / Pause Toggle
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // SECTION 1: Stop and reset previous audio so two tracks can never overlap
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audioRef.current) {
          el.pause();
          el.currentTime = 0;
        }
      });

      // If at end, restart from 00:00
      if (duration > 0 && currentTime >= duration - 0.1) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      audioRef.current.playbackRate = playbackRate;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Play failed:", err);
          setIsPlaying(false);
        });
    }
  };

  // Seek Handler for timeline slider
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget.value);
    if (!isNaN(val) && isFinite(val)) {
      setCurrentTime(val);
      if (audioRef.current) {
        audioRef.current.currentTime = val;
      }
    }
  };

  // Click on Waveform Canvas to seek proportionally
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * duration;
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // SECTION 4: Cycle through 0.75x, 1x, 1.25x, 1.5x, 2x
  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (audioRef.current) {
      audioRef.current.loop = nextLoop;
    }
  };

  // SECTION 6: Meaningful filenames and dual formats (WAV & MP3)
  const handleDownloadWav = () => {
    if (!currentAudio?.audioUrl) return;
    const a = document.createElement("a");
    a.href = currentAudio.audioUrl;
    const filename = generateAudioFilename(currentAudio.title || currentAudio.text, "wav");
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadMp3 = async () => {
    if (!currentAudio?.rawBase64) {
      handleDownloadWav();
      return;
    }
    try {
      setIsConvertingMp3(true);
      const mp3Blob = await convertPcmBase64ToMp3Blob(currentAudio.rawBase64, 24000);
      const filename = generateAudioFilename(currentAudio.title || currentAudio.text, "mp3");
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("MP3 conversion failed, fallback to WAV:", err);
      handleDownloadWav();
    } finally {
      setIsConvertingMp3(false);
    }
  };

  const handleCopyText = () => {
    if (!currentAudio?.text) return;
    navigator.clipboard.writeText(currentAudio.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentAudio) {
    return (
      <div
        id="empty-player-state"
        className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-6 sm:p-8 text-center flex flex-col items-center justify-center min-h-[180px] shadow-[0_1px_3px_rgba(20,33,61,0.03)]"
      >
        <div className="w-11 h-11 rounded-xl bg-[#F3EFE7] flex items-center justify-center text-[#E25C47] mb-2.5">
          <Radio className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-[#0F1E36]">
          {isAr ? "مشغل الصوت جاهز للاستماع" : "Audio Player Ready"}
        </h3>
        <p className="text-xs text-[#5C6B88] max-w-sm mt-1">
          {isAr
            ? "اكتب أو الصق أي نص واضغط 'تحويل النص إلى صوت الآن' لسماع النتيجة بنقاء 24kHz"
            : "Enter text and click 'Convert Text to Speech' to stream high-fidelity 24kHz audio."}
        </p>
      </div>
    );
  }

  return (
    <div
      id="active-audio-player"
      className="rounded-2xl border border-[#EAE3D9] bg-[#FFFDF9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(20,33,61,0.04)] relative overflow-hidden space-y-4"
    >
      {/* Native audio element with direct lifecycle & timeupdate listeners */}
      <audio
        ref={audioRef}
        preload="auto"
        src={currentAudio?.audioUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onCanPlay={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F3EFE7] text-[#0F1E36] border border-[#E5DED2]">
              {currentAudio.isMultiSpeaker
                ? isAr
                  ? "حوار ثنائي"
                  : "Two Speakers"
                : isAr
                ? `الصوت: ${currentAudio.voice}`
                : `Voice: ${currentAudio.voice}`}
            </span>
            <span className="text-xs text-[#5C6B88] font-mono">
              24kHz WAV · {new Date(currentAudio.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[#0F1E36] mt-1 line-clamp-1">
            {currentAudio.title}
          </h3>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="btn-copy-transcript"
            onClick={handleCopyText}
            className="p-2 rounded-lg hover:bg-[#F3EFE7] text-[#5C6B88] hover:text-[#0F1E36] border border-[#E5DED2] transition-colors cursor-pointer"
            title={isAr ? "نسخ النص" : "Copy text"}
            aria-label="Copy transcript"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            id="btn-download-wav"
            onClick={handleDownloadWav}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#F3EFE7] hover:bg-[#EAE3D9] text-[#0F1E36] text-xs font-medium border border-[#E5DED2] transition-colors cursor-pointer"
            title={isAr ? "تحميل ملف الصوت WAV" : "Download WAV Audio"}
            aria-label="Download WAV audio"
          >
            <Download className="w-3.5 h-3.5 text-[#E25C47]" />
            <span>{isAr ? "تحميل WAV" : "WAV"}</span>
          </button>
          <button
            id="btn-download-mp3"
            onClick={handleDownloadMp3}
            disabled={isConvertingMp3}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#F3EFE7] hover:bg-[#EAE3D9] text-[#0F1E36] text-xs font-medium border border-[#E5DED2] transition-colors cursor-pointer disabled:opacity-50"
            title={isAr ? "تحويل وتحميل ملف MP3" : "Convert & Download MP3"}
            aria-label="Download MP3 audio"
          >
            <Download className="w-3.5 h-3.5 text-[#E25C47]" />
            <span>{isConvertingMp3 ? (isAr ? "تحويل..." : "Converting...") : (isAr ? "تحميل MP3" : "MP3")}</span>
          </button>
        </div>
      </div>

      {/* Visualizer Canvas & Timeline */}
      <div className="relative bg-[#FAF7F2] border border-[#E5DED2] rounded-xl p-3">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-12 block cursor-pointer"
          title={isAr ? "انقر للانتقال إلى أي نقطة في الصوت" : "Click to seek anywhere in the waveform"}
        />

        {/* Timeline Scrubber with Coral Orange Accent */}
        <div className="mt-2">
          <input
            id="audio-seek-slider"
            type="range"
            min="0"
            max={duration > 0 ? duration : 100}
            step="any"
            value={duration > 0 ? Math.min(currentTime, duration) : 0}
            disabled={duration <= 0}
            onChange={handleSeek}
            onInput={handleSeek}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onTouchStart={() => setIsSeeking(true)}
            onTouchEnd={() => setIsSeeking(false)}
            className="w-full h-1.5 bg-[#DFD8CB] rounded-lg appearance-none cursor-pointer accent-[#E25C47] transition-all disabled:opacity-40"
            aria-label="Audio timeline seek"
          />
          <div className="flex justify-between text-xs font-mono text-[#5C6B88] tabular-nums mt-1">
            <span>{formatAudioDuration(currentTime)}</span>
            <span>{formatAudioDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {/* Main Play/Pause Button — Coral Orange Accent */}
          <button
            id="btn-play-pause"
            onClick={togglePlayPause}
            className="w-10 h-10 rounded-full bg-[#E25C47] hover:bg-[#D04F3B] active:bg-[#BF4330] text-[#FFFDF9] flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer font-bold"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-[#FFFDF9]" />
            ) : (
              <Play className="w-4 h-4 fill-[#FFFDF9] ml-0.5" />
            )}
          </button>

          {/* Replay 0:00 Button */}
          <button
            id="btn-restart-playback"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
                audioRef.current.play().catch(console.error);
                setIsPlaying(true);
                if (onReplay) onReplay();
              }
            }}
            className="p-2 rounded-lg hover:bg-[#F3EFE7] text-[#5C6B88] hover:text-[#0F1E36] border border-[#E5DED2] transition-colors cursor-pointer"
            title={isAr ? "إعادة من البداية" : "Restart from beginning"}
            aria-label="Restart audio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Controller */}
          <button
            id="btn-playback-speed"
            onClick={cyclePlaybackRate}
            className="px-2.5 py-1.5 rounded-lg bg-[#F3EFE7] hover:bg-[#EAE3D9] text-[#0F1E36] font-mono text-xs font-semibold border border-[#E5DED2] transition-colors cursor-pointer"
            title={isAr ? "سرعة التشغيل" : "Playback speed"}
          >
            {playbackRate}x
          </button>

          {/* Loop / Repeat */}
          <button
            id="btn-toggle-loop"
            onClick={toggleLoop}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isLooping
                ? "bg-[#0F1E36] text-[#FFFDF9] border-[#0F1E36]"
                : "bg-[#FFFDF9] hover:bg-[#F3EFE7] text-[#5C6B88] border-[#E5DED2]"
            }`}
            title={isAr ? "تكرار مستمر" : "Toggle Loop"}
            aria-label="Toggle loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-mute"
            onClick={toggleMute}
            className="p-1.5 text-[#5C6B88] hover:text-[#0F1E36] transition-colors cursor-pointer"
            aria-label="Toggle Mute"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-[#95A3B8]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#5C6B88]" />
            )}
          </button>
          <input
            id="audio-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1.5 bg-[#DFD8CB] rounded-lg appearance-none cursor-pointer accent-[#E25C47]"
            aria-label="Audio volume"
          />
        </div>
      </div>

      {/* SECTION 1: Auto-play toggle */}
      <div className="flex items-center justify-between text-xs text-[#5C6B88] pt-2 border-t border-[#EAE3D9]">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            id="toggle-autoplay-after-gen"
            type="checkbox"
            checked={autoPlayAfterGen}
            onChange={handleToggleAutoPlay}
            className="w-3.5 h-3.5 rounded border-[#E5DED2] accent-[#E25C47] cursor-pointer"
          />
          <span className="text-xs font-medium text-[#475569]">
            {isAr ? "تشغيل تلقائي بعد التوليد" : "Auto-play after generation"}
          </span>
        </label>
        <span className="text-[11px] text-[#5C6B88] font-mono">
          {autoPlayAfterGen
            ? (isAr ? "مفعّل" : "ON")
            : (isAr ? "معطّل (الافتراضي)" : "OFF (Default)")}
        </span>
      </div>

      {/* Spoken Text Preview Drawer */}
      <div className="pt-2 border-t border-[#EAE3D9]">
        <p className="text-xs text-[#5C6B88] leading-relaxed font-sans line-clamp-2 hover:line-clamp-none transition-all">
          <span className="font-semibold text-[#0F1E36] ml-1 mr-1">
            {isAr ? "النص المنطوق:" : "Spoken Script:"}
          </span>
          {currentAudio.text}
        </p>
      </div>
    </div>
  );
};
