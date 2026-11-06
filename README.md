# Sada iVoice | صَدَى

**A studio-grade AI Text-to-Speech web app** that turns written text into expressive, natural **24 kHz** audio — in Arabic and English — with single-voice and two-speaker dialogue generation.

🔗 **Live demo:** https://sada-ivoice.ai.studio/

<!-- Add a screenshot here: drag an image of the app into this file on GitHub, or place screenshot.png in the repo and uncomment the next line -->
<!-- ![Sada iVoice screenshot](screenshot.png) -->

## ✨ Features

- 🎙️ **6 neural voices** — 3 female and 3 male, each with its own character (narration, broadcast, documentary…)
- 👥 **Two modes** — Single Voice, or Two Speakers dialogue with a different voice per speaker
- 🎭 **5 delivery styles** — Natural & Balanced, Podcast & Broadcast, Storytelling & Narration, Inspiring Keynote, Commercial Promo
- 🐢 **Speaking-rate control** — Slow / Normal / Fast, applied to the generated voice itself
- ✍️ **AI Script Composer** — turn a one-line idea into a ready solo or dialogue script, with tone selection
- 📚 **6 ready templates** — Welcome, Inspirational, Radio Dialogue, Storytelling, Commercial, Documentary
- 🎧 **Full audio player** — real waveform, seek, playback speeds (0.75x–2x), loop, optional auto-play
- 💾 **Audio library** — every generation is saved in your browser; identical requests load instantly from the library instead of re-generating
- ⬇️ **WAV & MP3 export** — with meaningful file names (`sada-voice-<first-words>-<date>`)
- 🌐 **Arabic / English UI** — full RTL/LTR switch
- ✋ **2,000-character limit** with a live counter, so long texts are split before they fail

## 🛠️ Tech Stack

- **React + TypeScript + Vite**
- **Google Gemini API** (Gemini Flash TTS) for speech generation
- Built with **Google AI Studio**

## 🚀 Run Locally

```bash
git clone https://github.com/motazjamil/sada-ivoice.git
cd sada-ivoice
npm install
```

Create your environment file and add your own Gemini API key ([get one free from Google AI Studio](https://aistudio.google.com/apikey)):

```bash
cp .env.example .env
# then edit .env and set: GEMINI_API_KEY=your_key_here
```

> ⚠️ Never commit your real `.env` file — it is already listed in `.gitignore`.

```bash
npm run dev
```

## 🔒 Privacy

Texts are sent to Google's Gemini API only to generate audio. Generated clips and the audio library are stored **locally in the visitor's browser** — no accounts, no tracking, no external storage of your texts or recordings.

## 👤 Author

**Eng. Motaz Jamil** — Computer Information Systems student & developer
📧 contact@Motazjm245.com

## 📄 License

MIT — free to use, learn from, and build on, with credit to the author.

---

## بالعربية

**صَدَى (Sada iVoice)** — استوديو تحويل نص إلى كلام بالذكاء الاصطناعي: حوّل أي نص عربي أو إنجليزي إلى صوت بشري معبّر بجودة 24kHz، بصوت واحد أو حوار بين متحدثَين، مع 6 أصوات و5 أنماط إلقاء ومؤلّف سكريبتات ذكي ومكتبة صوتية وتنزيل WAV وMP3. جرّبه حياً: https://sada-ivoice.ai.studio/
