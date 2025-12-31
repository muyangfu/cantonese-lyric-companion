# Changes: Audio and Layout Optimization

## 2026-01-01
- **App.tsx**:
  - `[MODIFY]` Added `abortRef` to handle audio playback conflicts.
  - `[MODIFY]` Implemented `speakChar` for single character pronunciation.
  - `[MODIFY]` Updated `speakFromLine` for automatic continuation.
  - `[MODIFY]` Added `localStorage` persistence hooks.
  - `[MODIFY]` Updated layout styles for fixed sidebar and scrollable preview.
  - `[MODIFY]` Optimized `exportAsImage` and `exportAsPDF` to hide administrative UI.
- **index.css**:
  - `[MODIFY]` Added `.preview-scroll-area` for custom scrollbar.
  - `[MODIFY]` Added `.speaking` highlight animation.
- **services/geminiService.ts**:
  - `[MODIFY]` Fixed `GEMINI_API_KEY` environment variable usage.
- **.phrase/**:
  - `[NEW]` Initialized documentation hierarchy.
