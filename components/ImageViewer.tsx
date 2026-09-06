
import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Copy, Check, Tag, BrainCircuit, Timer, ChevronLeft, ChevronRight, Wallet, Edit3, Maximize2, Share2, Code2, MessageSquareText, FileJson, ListOrdered } from 'lucide-react';
import { GeneratedImage, Currency } from '../types';

interface ImageViewerProps {
  image: GeneratedImage;
  isCopied: boolean;
  onClose: () => void;
  onCopy: () => void;
  onNext: () => void;
  onPrev: () => void;
  onEdit: () => void;
  currency: Currency;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ image, isCopied, onClose, onCopy, onNext, onPrev, onEdit, currency }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showThinking, setShowThinking] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.0015;
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 10));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Nano Art: ${image.filename}`,
          text: image.prompt,
          url: window.location.href,
        });
      } catch (err) {
        console.error("分享失败:", err);
      }
    } else {
        onCopy();
        alert("浏览器不支持原生分享，已为您复制咒语内容。");
    }
  };

  const renderCodeContent = () => {
    if (image.structuraData) {
        return JSON.stringify(image.structuraData.prompt_payload, null, 2);
    }
    // Try parse refinedPrompt if it looks like JSON
    const text = image.refinedPrompt || "";
    if (text.trim().startsWith('{')) {
        try {
            return JSON.stringify(JSON.parse(text), null, 2);
        } catch (e) {
            return text;
        }
    }
    return text || "No Data";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}>
      
      {/* 顶部控制栏 - 响应式调整 */}
      <div className="absolute top-0 inset-x-0 p-4 lg:p-6 flex justify-between items-start z-[110] pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 lg:gap-3 pointer-events-auto">
             <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-1 flex gap-0.5 shadow-2xl overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); setScale(Math.min(scale + 0.5, 10)); }} className="p-2 lg:p-3 hover:bg-white/10 rounded-xl text-slate-300 transition-colors"><ZoomIn size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); setScale(Math.max(0.5, scale - 0.5)); }} className="p-2 lg:p-3 hover:bg-white/10 rounded-xl text-slate-300 transition-colors"><ZoomOut size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); setScale(1); setPosition({x:0,y:0}); }} className="p-2 lg:p-3 hover:bg-white/10 rounded-xl text-slate-300 transition-colors"><RotateCcw size={18} /></button>
             </div>
             
             <div className="hidden sm:flex bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-1 shadow-2xl">
               <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-2 bg-banana-500 hover:bg-banana-400 text-slate-950 px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest transition-all"><Edit3 size={14} /> 编辑</button>
               <button onClick={(e) => { e.stopPropagation(); setShowThinking(!showThinking); }} className={`flex items-center gap-2 text-[9px] lg:text-[10px] font-black uppercase px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl transition-all ${showThinking ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-300 hover:bg-white/5'}`}><BrainCircuit size={14} /> 核心数据</button>
             </div>

             <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl px-4 py-2.5 lg:px-5 lg:py-3.5 border border-white/10 flex items-center gap-2 text-banana-500 font-black text-[9px] lg:text-[10px] uppercase tracking-widest shadow-2xl">
                <Wallet size={12} /> <span>{currency === 'RMB' ? `¥${image.costRMB.toFixed(2)}` : `$${image.costUSD.toFixed(3)}`}</span>
             </div>
        </div>

        <div className="flex gap-2 lg:gap-3 pointer-events-auto">
          <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className={`hidden md:flex px-6 py-3.5 rounded-2xl transition-all shadow-2xl items-center gap-2 border ${isCopied ? 'bg-green-500 border-green-400 text-white' : 'bg-slate-900/90 border-white/10 hover:bg-slate-800 text-white'}`}>
            {isCopied ? <Check size={18} /> : <Copy size={18} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{isCopied ? '已复制' : '复制咒语'}</span>
          </button>
          <a href={image.url} download={`${image.filename}.png`} onClick={(e) => e.stopPropagation()} className="p-3 lg:p-4 bg-banana-500 hover:bg-banana-400 text-slate-950 rounded-2xl transition-all shadow-xl" title="下载原图"><Download size={20} /></a>
          <button onClick={onClose} className="p-3 lg:p-4 bg-slate-900/90 hover:bg-red-500/20 text-white hover:text-red-400 rounded-2xl transition-all border border-white/10"><X size={20} /></button>
        </div>
      </div>

      {/* 左右翻页 - 手机端缩小以防误触 */}
      <div className="absolute inset-x-4 lg:inset-x-6 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-[105]">
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-4 lg:p-6 bg-white/5 hover:bg-white/10 backdrop-blur-3xl rounded-full text-white border border-white/10 transition-all pointer-events-auto shadow-2xl group"><ChevronLeft size={24} /></button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-4 lg:p-6 bg-white/5 hover:bg-white/10 backdrop-blur-3xl rounded-full text-white border border-white/10 transition-all pointer-events-auto shadow-2xl group"><ChevronRight size={24} /></button>
      </div>

      {/* 主图片显示 */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)} onClick={(e) => e.stopPropagation()}>
        <img src={image.url} alt={image.prompt} className="max-w-[95%] max-h-[85%] object-contain transition-transform duration-150 select-none shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-3xl lg:rounded-[3rem]" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }} draggable={false} />
      </div>

      {/* 溯源面板 - 核心数据展示 */}
      {showThinking && (
          <div className="absolute top-24 lg:top-32 left-4 lg:left-8 w-80 lg:w-96 bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 shadow-2xl animate-in slide-in-from-left-4 duration-500 pointer-events-auto z-[120] flex flex-col gap-5 max-h-[60vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-banana-500 font-black text-[10px] uppercase tracking-widest"><BrainCircuit size={16} /> 核心数据</div>
                  <div className="text-[9px] font-mono text-slate-500">{image.totalDuration.toFixed(2)}s</div>
              </div>

              {/* 顶部常驻：中文意图翻译与任务标签 */}
              <div className="space-y-2 shrink-0">
                {image.structuraData?.detected_task && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-banana-500/20 text-banana-400 text-[9px] font-black uppercase tracking-wider border border-banana-500/30">
                      {image.structuraData.detected_task}
                    </span>
                    {image.structuraData.mode && (
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-[9px] font-black uppercase tracking-wider border border-white/10">
                        {image.structuraData.mode === 'aggressive' ? '强优化 (Aggressive)' : '标准优化 (Standard)'}
                      </span>
                    )}
                  </div>
                )}
                {image.promptTranslation && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <MessageSquareText size={12} className="text-banana-500" /> 
                          中文构建意图
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{image.promptTranslation}</p>
                  </div>
                )}
              </div>

              {/* 切换开关 */}
              <div className="flex bg-slate-800/50 p-1 rounded-xl shrink-0">
                  <button onClick={() => setShowCode(false)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${!showCode ? 'bg-banana-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}><ListOrdered size={12}/> 执行流</button>
                  <button onClick={() => setShowCode(true)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${showCode ? 'bg-banana-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}><FileJson size={12}/> 结构化 JSON</button>
              </div>

              {/* 可滚动内容区域 */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {!showCode ? (
                    <div className="space-y-3 pt-1">
                       {image.thoughtLog.map((step, idx) => (
                           <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                               <div className={`w-2 h-2 rounded-full ${step.status === 'done' ? 'bg-banana-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-slate-700'}`} />
                               <span className="text-[10px] font-bold text-slate-300">{step.name}</span>
                           </div>
                       ))}
                    </div>
                ) : (
                    <div className="relative pt-1">
                        <pre className="text-[9px] font-mono text-green-400 bg-black/50 p-4 rounded-2xl border border-white/5 overflow-x-auto whitespace-pre-wrap break-all leading-tight">
                            {renderCodeContent()}
                        </pre>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                navigator.clipboard.writeText(renderCodeContent()); 
                                alert('JSON 代码已复制');
                            }}
                            className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            title="复制 JSON"
                        >
                            <Copy size={12} />
                        </button>
                    </div>
                )}
              </div>
          </div>
      )}

      {/* 底部信息与动作浮层 */}
      <div className="absolute bottom-6 lg:bottom-10 inset-x-0 px-4 text-center pointer-events-none">
        <div className="inline-flex flex-col items-center gap-4 lg:gap-5 px-6 py-6 lg:px-12 lg:py-8 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl max-w-2xl mx-auto pointer-events-auto">
            <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4 mb-2">
               <div className="flex items-center gap-2 text-banana-500 font-black uppercase text-[9px] lg:text-[10px] tracking-widest"><Tag size={12} /> <span>{image.filename}</span></div>
               <span className="w-1 h-1 bg-white/20 rounded-full" />
               <p className="text-white/60 text-[9px] lg:text-[10px] font-black uppercase tracking-widest">Nano Pro Engine</p>
            </div>
            
            <p className="text-white text-xs lg:text-sm font-bold line-clamp-2 italic leading-relaxed mb-2">"{image.prompt || '纳米意图重构渲染'}"</p>

            {/* 移动端/大图查看时增加的动作行 */}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
               <a 
                 href={image.url} 
                 download={`${image.filename}.png`} 
                 className="flex-1 min-w-[140px] flex items-center justify-center gap-3 bg-banana-500 hover:bg-banana-400 text-slate-950 px-6 py-3.5 lg:py-4 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all shadow-lg active:scale-95"
                 onClick={(e) => e.stopPropagation()}
               >
                 <Download size={18} />
                 下载并保存
               </a>
               
               <button 
                 onClick={(e) => { e.stopPropagation(); handleShare(); }}
                 className="p-3.5 lg:p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2"
                 title="分享"
               >
                 <Share2 size={18} />
                 <span className="hidden sm:inline text-[10px] font-black uppercase">分享</span>
               </button>

               <button 
                 onClick={(e) => { e.stopPropagation(); onEdit(); }}
                 className="sm:hidden p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all"
                 title="编辑"
               >
                 <Edit3 size={18} />
               </button>
            </div>

            <div className="hidden lg:flex items-center gap-4 text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1 opacity-50">
               <span>ESC 退出</span>
               <span className="w-1 h-1 bg-current rounded-full" />
               <span>双指捏合缩放</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
