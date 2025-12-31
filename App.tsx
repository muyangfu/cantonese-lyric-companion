
import React, { useState, useRef } from 'react';
import { fetchCantoneseData } from './services/geminiService';
import { LyricLine, StyleConfig } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [style, setStyle] = useState<StyleConfig>({
    pinyin: { show: true, fontSize: 14, color: '#64748b', fontWeight: 'normal' },
    lyric: { fontSize: 24, color: '#1e293b', fontWeight: 'bold' },
    homophone: { show: true, fontSize: 14, color: '#94a3b8', fontWeight: 'normal' },
    lineSpacing: 40,
    alignment: 'center'
  });

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

  const exportAsImage = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    const link = document.createElement('a');
    link.download = 'cantonese-lyrics.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportAsPDF = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('cantonese-lyrics.pdf');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">粤</div>
          <h1 className="text-xl font-bold text-slate-800">粤韵歌词 <span className="text-sm font-normal text-slate-500">Cantonese Companion</span></h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportAsImage}
            disabled={lyricsData.length === 0}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            导出图片
          </button>
          <button 
            onClick={exportAsPDF}
            disabled={lyricsData.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            导出 PDF
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Left Sidebar: Controls */}
        <div className="w-full md:w-80 flex flex-col gap-6 overflow-y-auto pr-2 no-print">
          <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">输入歌词</h2>
            <textarea
              className="w-full h-40 p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="请输入中文歌词..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !inputText}
              className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  解析中...
                </>
              ) : '一键生成注音'}
            </button>
          </section>

          <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">样式调整</h2>
            
            {/* Pinyin Styles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">粤语拼音 (Jyutping)</label>
                <input 
                  type="checkbox" 
                  checked={style.pinyin.show} 
                  onChange={(e) => setStyle(prev => ({ ...prev, pinyin: { ...prev.pinyin, show: e.target.checked }}))}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number" 
                  value={style.pinyin.fontSize} 
                  onChange={(e) => setStyle(prev => ({ ...prev, pinyin: { ...prev.pinyin, fontSize: Number(e.target.value) }}))}
                  className="px-2 py-1 text-xs border border-slate-200 rounded"
                />
                <input 
                  type="color" 
                  value={style.pinyin.color} 
                  onChange={(e) => setStyle(prev => ({ ...prev, pinyin: { ...prev.pinyin, color: e.target.value }}))}
                  className="w-full h-8 border border-slate-200 rounded p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Lyric Styles */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">歌词本体 (Lyric)</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number" 
                  value={style.lyric.fontSize} 
                  onChange={(e) => setStyle(prev => ({ ...prev, lyric: { ...prev.lyric, fontSize: Number(e.target.value) }}))}
                  className="px-2 py-1 text-xs border border-slate-200 rounded"
                />
                <input 
                  type="color" 
                  value={style.lyric.color} 
                  onChange={(e) => setStyle(prev => ({ ...prev, lyric: { ...prev.lyric, color: e.target.value }}))}
                  className="w-full h-8 border border-slate-200 rounded p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Homophone Styles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">中文谐音 (Homophone)</label>
                <input 
                  type="checkbox" 
                  checked={style.homophone.show} 
                  onChange={(e) => setStyle(prev => ({ ...prev, homophone: { ...prev.homophone, show: e.target.checked }}))}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number" 
                  value={style.homophone.fontSize} 
                  onChange={(e) => setStyle(prev => ({ ...prev, homophone: { ...prev.homophone, fontSize: Number(e.target.value) }}))}
                  className="px-2 py-1 text-xs border border-slate-200 rounded"
                />
                <input 
                  type="color" 
                  value={style.homophone.color} 
                  onChange={(e) => setStyle(prev => ({ ...prev, homophone: { ...prev.homophone, color: e.target.value }}))}
                  className="w-full h-8 border border-slate-200 rounded p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Spacing & Alignment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">行间距</label>
              <input 
                type="range" min="10" max="100" 
                value={style.lineSpacing} 
                onChange={(e) => setStyle(prev => ({ ...prev, lineSpacing: Number(e.target.value) }))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">对齐方式</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setStyle(prev => ({ ...prev, alignment: align }))}
                    className={`flex-1 py-1.5 text-xs rounded border transition-all ${
                      style.alignment === align ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {align === 'left' ? '左对齐' : align === 'center' ? '居中' : '右对齐'}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Preview Area */}
        <div className="flex-1 overflow-auto">
          <div 
            ref={previewRef}
            className={`preview-container bg-white p-12 shadow-lg rounded-2xl min-h-full flex flex-col gap-[${style.lineSpacing}px]`}
            style={{ 
              gap: `${style.lineSpacing}px`, 
              textAlign: style.alignment,
              paddingBottom: '100px'
            }}
          >
            {lyricsData.length > 0 ? (
              lyricsData.map((line, lineIdx) => (
                <div key={lineIdx} className={`flex flex-wrap ${style.alignment === 'center' ? 'justify-center' : style.alignment === 'right' ? 'justify-end' : 'justify-start'} gap-x-2`}>
                  {line.units.map((unit, unitIdx) => (
                    <div key={unitIdx} className="inline-flex flex-col items-center">
                      {style.pinyin.show && (
                        <span 
                          style={{ 
                            fontSize: `${style.pinyin.fontSize}px`, 
                            color: style.pinyin.color,
                            fontWeight: style.pinyin.fontWeight,
                            visibility: unit.jyutping ? 'visible' : 'hidden'
                          }}
                          className="leading-none mb-1"
                        >
                          {unit.jyutping || '\u00A0'}
                        </span>
                      )}
                      <span 
                        style={{ 
                          fontSize: `${style.lyric.fontSize}px`, 
                          color: style.lyric.color,
                          fontWeight: style.lyric.fontWeight
                        }}
                        className="leading-none py-1"
                      >
                        {unit.char}
                      </span>
                      {style.homophone.show && (
                        <span 
                          style={{ 
                            fontSize: `${style.homophone.fontSize}px`, 
                            color: style.homophone.color,
                            fontWeight: style.homophone.fontWeight,
                            visibility: unit.homophone ? 'visible' : 'hidden'
                          }}
                          className="leading-none mt-1 opacity-80"
                        >
                          {unit.homophone || '\u00A0'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 mt-20">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p className="text-lg font-medium">预览区域：请输入歌词并生成注音</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="no-print bg-white border-t px-6 py-4 text-center text-slate-400 text-sm">
        <p>© 2024 粤韵歌词 - 助力粤语音乐学习 | 基于 Gemini AI 提供解析支持</p>
      </footer>
    </div>
  );
};

export default App;
