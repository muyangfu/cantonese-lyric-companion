
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fetchCantoneseData } from './services/geminiService';
import { LyricLine, StyleConfig } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// localStorage keys
const STORAGE_KEYS = {
  inputText: 'cantonese-lyrics-input',
  lyricsData: 'cantonese-lyrics-data',
  style: 'cantonese-lyrics-style'
};

const App: React.FC = () => {
  // 从 localStorage 初始化状态
  const [inputText, setInputText] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.inputText) || '';
    } catch {
      return '';
    }
  });

  const [lyricsData, setLyricsData] = useState<LyricLine[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.lyricsData);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // 朗读相关状态
  const [playingLine, setPlayingLine] = useState<number | null>(null);
  const [playingUnit, setPlayingUnit] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [style, setStyle] = useState<StyleConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.style);
      return saved ? JSON.parse(saved) : {
        pinyin: { show: true, fontSize: 14, color: '#4a6ea8', fontWeight: 'normal' },
        lyric: { fontSize: 28, color: '#2d3748', fontWeight: 'bold' },
        homophone: { show: true, fontSize: 14, color: '#718096', fontWeight: 'normal' },
        lineSpacing: 48,
        alignment: 'center'
      };
    } catch {
      return {
        pinyin: { show: true, fontSize: 14, color: '#4a6ea8', fontWeight: 'normal' },
        lyric: { fontSize: 28, color: '#2d3748', fontWeight: 'bold' },
        homophone: { show: true, fontSize: 14, color: '#718096', fontWeight: 'normal' },
        lineSpacing: 48,
        alignment: 'center'
      };
    }
  });

  // 保存数据到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.inputText, inputText);
    } catch { }
  }, [inputText]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.lyricsData, JSON.stringify(lyricsData));
    } catch { }
  }, [lyricsData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.style, JSON.stringify(style));
    } catch { }
  }, [style]);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const data = await fetchCantoneseData(inputText);
      setLyricsData(data);
    } catch (error) {
      alert('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 朗读中止标志
  const abortRef = useRef<boolean>(false);

  // 停止朗读（统一停止逻辑）
  const stopSpeaking = useCallback(() => {
    abortRef.current = true;  // 标记中止，让已排队的 setTimeout 回调不再继续
    window.speechSynthesis.cancel();
    setPlayingLine(null);
    setPlayingUnit(-1);
    setIsPlaying(false);
  }, []);

  // 单字发音
  const speakChar = useCallback((char: string) => {
    // 先完整停止之前的播放
    stopSpeaking();

    if (!char.trim() || /^[\p{P}\p{S}]$/u.test(char)) return;

    // 重置中止标志（单字发音不需要检查中止）
    abortRef.current = false;

    const utterance = new SpeechSynthesisUtterance(char);
    utterance.lang = 'zh-HK';
    utterance.rate = 0.7;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking]);

  // 检查行是否为空行（没有有效字符）
  const isEmptyLine = useCallback((line: LyricLine) => {
    return !line.units.some(unit => unit.char.trim() && !/^[\p{P}\p{S}]$/u.test(unit.char));
  }, []);

  // 朗读从指定行开始，自动播放到结束
  const speakFromLine = useCallback((startLineIdx: number) => {
    // 如果正在播放当前行，则停止
    if (playingLine === startLineIdx && isPlaying) {
      stopSpeaking();
      return;
    }

    // 停止之前的播放
    stopSpeaking();

    // 短暂延迟确保状态已清理，然后开始新播放
    setTimeout(() => {
      // 重置中止标志，开始新播放
      abortRef.current = false;

      setPlayingLine(startLineIdx);
      setPlayingUnit(-1);
      setIsPlaying(true);

      let currentLineIdx = startLineIdx;
      let currentUnitIdx = 0;

      const speakNext = () => {
        // 检查是否被中止
        if (abortRef.current) {
          return;
        }

        // 检查是否超出所有行
        if (currentLineIdx >= lyricsData.length) {
          stopSpeaking();
          return;
        }

        const line = lyricsData[currentLineIdx];

        // 如果是空行，跳到下一行
        if (isEmptyLine(line)) {
          currentLineIdx++;
          currentUnitIdx = 0;
          if (!abortRef.current) {
            setPlayingLine(currentLineIdx);
            setPlayingUnit(-1);
          }
          setTimeout(speakNext, 100);
          return;
        }

        // 检查是否超出当前行
        if (currentUnitIdx >= line.units.length) {
          // 进入下一行
          currentLineIdx++;
          currentUnitIdx = 0;
          if (!abortRef.current) {
            setPlayingLine(currentLineIdx);
            setPlayingUnit(-1);
          }
          // 行间稍作停顿
          setTimeout(speakNext, 300);
          return;
        }

        const unit = line.units[currentUnitIdx];

        // 跳过标点符号或空白字符
        if (!unit.char.trim() || /^[\p{P}\p{S}]$/u.test(unit.char)) {
          currentUnitIdx++;
          speakNext();
          return;
        }

        if (!abortRef.current) {
          setPlayingUnit(currentUnitIdx);
        }

        const utterance = new SpeechSynthesisUtterance(unit.char);
        utterance.lang = 'zh-HK';
        utterance.rate = 0.8;
        utterance.pitch = 1;

        utterance.onend = () => {
          if (!abortRef.current) {
            currentUnitIdx++;
            setTimeout(speakNext, 100);
          }
        };

        utterance.onerror = () => {
          if (!abortRef.current) {
            currentUnitIdx++;
            speakNext();
          }
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    }, 50);  // 短暂延迟确保状态同步
  }, [lyricsData, playingLine, isPlaying, stopSpeaking, isEmptyLine]);

  // 组件卸载时停止朗读
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const exportAsImage = async () => {
    if (!previewRef.current) return;

    // 保存原始样式
    const originalWidth = previewRef.current.style.width;
    const originalMinWidth = previewRef.current.style.minWidth;

    // 隐藏音频按钮
    const audioButtons = previewRef.current.querySelectorAll('.audio-btn');
    const emptyPlaceholders = previewRef.current.querySelectorAll('.no-print');
    audioButtons.forEach(btn => (btn as HTMLElement).style.display = 'none');
    emptyPlaceholders.forEach(el => (el as HTMLElement).style.display = 'none');

    // 设置固定宽度以确保布局正确
    previewRef.current.style.width = '800px';
    previewRef.current.style.minWidth = '800px';

    try {
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: 800,
        windowWidth: 800
      });
      const link = document.createElement('a');
      link.download = 'cantonese-lyrics.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      // 恢复原始样式
      previewRef.current.style.width = originalWidth;
      previewRef.current.style.minWidth = originalMinWidth;
      // 恢复音频按钮显示
      audioButtons.forEach(btn => (btn as HTMLElement).style.display = 'flex');
      emptyPlaceholders.forEach(el => (el as HTMLElement).style.display = '');
    }
  };

  const exportAsPDF = async () => {
    if (!previewRef.current) return;

    // 保存原始样式
    const originalWidth = previewRef.current.style.width;
    const originalMinWidth = previewRef.current.style.minWidth;

    // 隐藏音频按钮
    const audioButtons = previewRef.current.querySelectorAll('.audio-btn');
    const emptyPlaceholders = previewRef.current.querySelectorAll('.no-print');
    audioButtons.forEach(btn => (btn as HTMLElement).style.display = 'none');
    emptyPlaceholders.forEach(el => (el as HTMLElement).style.display = 'none');

    // 设置固定宽度以确保布局正确
    previewRef.current.style.width = '800px';
    previewRef.current.style.minWidth = '800px';

    try {
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: 800,
        windowWidth: 800
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('cantonese-lyrics.pdf');
    } finally {
      // 恢复原始样式
      previewRef.current.style.width = originalWidth;
      previewRef.current.style.minWidth = originalMinWidth;
      // 恢复音频按钮显示
      audioButtons.forEach(btn => (btn as HTMLElement).style.display = 'flex');
      emptyPlaceholders.forEach(el => (el as HTMLElement).style.display = '');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="app-header px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="logo-icon">粤</div>
          <div>
            <h1 className="app-title">粤韵歌词</h1>
            <p className="app-subtitle">Cantonese Lyric Companion</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportAsImage}
            disabled={lyricsData.length === 0}
            className="btn btn-secondary"
          >
            导出图片
          </button>
          <button
            onClick={exportAsPDF}
            disabled={lyricsData.length === 0}
            className="btn btn-accent"
          >
            导出 PDF
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-7xl mx-auto w-full overflow-hidden animate-stagger" style={{ height: 'calc(100vh - 130px)' }}>
        {/* Left Sidebar: Controls - 固定不滚动 */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6 pr-2 no-print" style={{ maxHeight: '100%', overflowY: 'auto' }}>
          <section className="card p-6">
            <h2 className="card-header">输入歌词</h2>
            <textarea
              className="input-field h-40 resize-none"
              placeholder="请输入中文歌词，每行一句..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !inputText}
              className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>解析中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>一键生成注音</span>
                </>
              )}
            </button>
          </section>

          <section className="card p-6 flex flex-col gap-5">
            <h2 className="card-header">样式调整</h2>

            {/* Pinyin Styles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium" style={{ color: 'var(--color-charcoal)' }}>
                  粤语拼音 <span className="text-xs opacity-60">(Jyutping)</span>
                </label>
                <input
                  type="checkbox"
                  checked={style.pinyin.show}
                  onChange={(e) => setStyle(prev => ({ ...prev, pinyin: { ...prev.pinyin, show: e.target.checked } }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs opacity-60 mb-1 block">字号</label>
                  <input
                    type="number"
                    value={style.pinyin.fontSize}
                    onChange={(e) => setStyle(prev => ({ ...prev, pinyin: { ...prev.pinyin, fontSize: Number(e.target.value) } }))}
                    className="input-field text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 mb-1 block">颜色</label>
                  <input
                    type="color"
                    value={style.pinyin.color}
                    onChange={(e) => setStyle(prev => ({ ...prev, pinyin: { ...prev.pinyin, color: e.target.value } }))}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            {/* Lyric Styles */}
            <div>
              <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--color-charcoal)' }}>
                歌词本体 <span className="text-xs opacity-60">(Lyric)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs opacity-60 mb-1 block">字号</label>
                  <input
                    type="number"
                    value={style.lyric.fontSize}
                    onChange={(e) => setStyle(prev => ({ ...prev, lyric: { ...prev.lyric, fontSize: Number(e.target.value) } }))}
                    className="input-field text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 mb-1 block">颜色</label>
                  <input
                    type="color"
                    value={style.lyric.color}
                    onChange={(e) => setStyle(prev => ({ ...prev, lyric: { ...prev.lyric, color: e.target.value } }))}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            {/* Homophone Styles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium" style={{ color: 'var(--color-charcoal)' }}>
                  中文谐音 <span className="text-xs opacity-60">(Homophone)</span>
                </label>
                <input
                  type="checkbox"
                  checked={style.homophone.show}
                  onChange={(e) => setStyle(prev => ({ ...prev, homophone: { ...prev.homophone, show: e.target.checked } }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs opacity-60 mb-1 block">字号</label>
                  <input
                    type="number"
                    value={style.homophone.fontSize}
                    onChange={(e) => setStyle(prev => ({ ...prev, homophone: { ...prev.homophone, fontSize: Number(e.target.value) } }))}
                    className="input-field text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-60 mb-1 block">颜色</label>
                  <input
                    type="color"
                    value={style.homophone.color}
                    onChange={(e) => setStyle(prev => ({ ...prev, homophone: { ...prev.homophone, color: e.target.value } }))}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: 'var(--color-charcoal)' }}>行间距</label>
                <span className="text-xs opacity-60">{style.lineSpacing}px</span>
              </div>
              <input
                type="range" min="20" max="100"
                value={style.lineSpacing}
                onChange={(e) => setStyle(prev => ({ ...prev, lineSpacing: Number(e.target.value) }))}
              />
            </div>

            {/* Alignment */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-charcoal)' }}>对齐方式</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setStyle(prev => ({ ...prev, alignment: align }))}
                    className={`align-btn ${style.alignment === align ? 'active' : ''}`}
                  >
                    {align === 'left' ? '左对齐' : align === 'center' ? '居中' : '右对齐'}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Preview Area - 独立滚动 */}
        <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="preview-scroll-area">
            <div
              ref={previewRef}
              className="preview-container p-12 min-h-full flex flex-col"
              style={{
                gap: `${style.lineSpacing}px`,
                textAlign: style.alignment,
                paddingBottom: '100px'
              }}
            >
              {lyricsData.length > 0 ? (
                lyricsData.map((line, lineIdx) => {
                  const isEmpty = isEmptyLine(line);
                  return (
                    <div
                      key={lineIdx}
                      className="lyric-line"
                      style={{
                        animationDelay: `${lineIdx * 0.05}s`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: style.alignment === 'center' ? 'center' : style.alignment === 'right' ? 'flex-end' : 'flex-start',
                        gap: '8px',
                        minHeight: isEmpty ? '20px' : 'auto'
                      }}
                    >
                      {/* 音频播放按钮 - 空行不显示 */}
                      {!isEmpty && (
                        <button
                          onClick={() => speakFromLine(lineIdx)}
                          className="audio-btn no-print"
                          style={{
                            flexShrink: 0,
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            background: playingLine === lineIdx ? 'var(--color-jade)' : 'var(--color-mist)',
                            color: playingLine === lineIdx ? 'white' : 'var(--color-charcoal)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            marginTop: style.pinyin.show ? `${style.pinyin.fontSize + 4}px` : '0'
                          }}
                          title={playingLine === lineIdx ? '停止朗读' : '从此行开始朗读'}
                        >
                          {playingLine === lineIdx ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 5L6 9H2v6h4l5 4V5z" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                          )}
                        </button>
                      )}
                      {/* 空行占位符 */}
                      {isEmpty && <div style={{ width: '32px', flexShrink: 0 }} className="no-print" />}

                      {/* 歌词内容 */}
                      <div style={{ textAlign: style.alignment }}>
                        {line.units.map((unit, unitIdx) => (
                          <div
                            key={unitIdx}
                            className={`lyric-unit ${playingLine === lineIdx && playingUnit === unitIdx ? 'speaking' : ''}`}
                            style={{
                              display: 'inline-block',
                              verticalAlign: 'top',
                              margin: '0 4px',
                              transition: 'all 0.2s ease',
                              cursor: unit.char.trim() && !/^[\p{P}\p{S}]$/u.test(unit.char) ? 'pointer' : 'default'
                            }}
                            onClick={() => speakChar(unit.char)}
                            title={unit.char.trim() && !/^[\p{P}\p{S}]$/u.test(unit.char) ? '点击发音' : ''}
                          >
                            {style.pinyin.show && (
                              <div
                                className="lyric-pinyin"
                                style={{
                                  fontSize: `${style.pinyin.fontSize}px`,
                                  color: playingLine === lineIdx && playingUnit === unitIdx ? '#c53030' : style.pinyin.color,
                                  fontWeight: style.pinyin.fontWeight,
                                  visibility: unit.jyutping ? 'visible' : 'hidden',
                                  textAlign: 'center',
                                  marginBottom: '2px',
                                  transition: 'color 0.2s ease'
                                }}
                              >
                                {unit.jyutping || '\u00A0'}
                              </div>
                            )}
                            <div
                              className="lyric-char"
                              style={{
                                fontSize: `${style.lyric.fontSize}px`,
                                color: playingLine === lineIdx && playingUnit === unitIdx ? '#c53030' : style.lyric.color,
                                fontWeight: style.lyric.fontWeight,
                                textAlign: 'center',
                                transition: 'color 0.2s ease',
                                transform: playingLine === lineIdx && playingUnit === unitIdx ? 'scale(1.1)' : 'scale(1)'
                              }}
                            >
                              {unit.char}
                            </div>
                            {style.homophone.show && (
                              <div
                                className="lyric-homophone"
                                style={{
                                  fontSize: `${style.homophone.fontSize}px`,
                                  color: playingLine === lineIdx && playingUnit === unitIdx ? '#c53030' : style.homophone.color,
                                  fontWeight: style.homophone.fontWeight,
                                  visibility: unit.homophone ? 'visible' : 'hidden',
                                  textAlign: 'center',
                                  marginTop: '2px',
                                  transition: 'color 0.2s ease'
                                }}
                              >
                                {unit.homophone || '\u00A0'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state h-full flex flex-col items-center justify-center gap-4 mt-20">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                  </svg>
                  <div className="text-center">
                    <p className="text-lg font-medium mb-1">预览区域</p>
                    <p className="text-sm">请在左侧输入歌词并点击生成注音</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer no-print px-6 py-4 text-center text-sm">
        <p>© 2024 粤韵歌词 — 助力粤语音乐学习 · Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
