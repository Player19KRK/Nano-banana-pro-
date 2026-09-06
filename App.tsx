
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Download, Loader2, Image as ImageIcon, Check, Activity, Sun, Moon, Layers, X, ChevronLeft, ChevronRight, Wallet, Info, Coins, Zap, Cpu, Settings, Edit3, Wand2, Key, Trash2, AlertTriangle, Flame } from 'lucide-react';
import { generateSingleImage, analyzeAndName, optimizePromptStandalone } from './services/geminiService';
import SettingsPanel from './components/SettingsPanel';
import ImageUploader from './components/ImageUploader';
import ImageViewer from './components/ImageViewer';
import ImageEditor from './components/ImageEditor';
import { AspectRatio, ImageSize, GeneratedImage, AIModel, GenerationStep, GeneratedBatch, Currency, EditingImage, OptimizationMode } from './types';
import { saveState, getState, clearAllState, fileToDataUrl, dataUrlToFile, SavedImageFile } from './utils/storage';

const EXCHANGE_RATE = 7.2;

const getPriceInfo = (model: AIModel, size: ImageSize): { rmb: number, usd: number } => {
  let usd = 0;
  if (model === AIModel.Standard) {
    usd = 0.04;
  } else if (model === AIModel.NanoBanana2) {
    if (size === ImageSize.Size_4K) usd = 0.15;
    else usd = 0.08;
  } else {
    if (size === ImageSize.Size_4K) usd = 0.24;
    else usd = 0.134;
  }
  return { usd, rmb: parseFloat((usd * EXCHANGE_RATE).toFixed(2)) };
};

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [inputImages, setInputImages] = useState<File[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Square);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.Size_1K);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [model, setModel] = useState<AIModel>(AIModel.Pro);
  const [thinkingLevel, setThinkingLevel] = useState<'HIGH' | 'LOW'>('HIGH');
  const [isSmartAnalysis, setIsSmartAnalysis] = useState<boolean>(false); // 默认关闭提示词优化
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('standard'); // 默认 Standard 优化
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currency, setCurrency] = useState<Currency>('RMB');
  const [uiScale, setUiScale] = useState(1.0);
  const [showUISettings, setShowUISettings] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [batches, setBatches] = useState<GeneratedBatch[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [editingImage, setEditingImage] = useState<EditingImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
  
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const startTimeRef = useRef<number>(0);

  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [mentionState, setMentionState] = useState<{ isOpen: boolean, query: string, startIndex: number } | null>(null);
  const mentionFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // 1. 初始化从持久化存储恢复数据（页面刷新不丢失）
  useEffect(() => {
    const initFromStorage = async () => {
      try {
        const savedPrompt = await getState<string>('prompt', '');
        const savedAspect = await getState<AspectRatio>('aspectRatio', AspectRatio.Square);
        const savedSize = await getState<ImageSize>('imageSize', ImageSize.Size_1K);
        const savedBatchSize = await getState<number>('batchSize', 1);
        const savedModel = await getState<AIModel>('model', AIModel.Pro);
        const savedThinking = await getState<'HIGH' | 'LOW'>('thinkingLevel', 'HIGH');
        const savedSmart = await getState<boolean>('isSmartAnalysis', false);
        const savedOptMode = await getState<OptimizationMode>('optimizationMode', 'standard');
        const savedDarkMode = await getState<boolean>('isDarkMode', true);
        const savedCurrency = await getState<Currency>('currency', 'RMB');
        const savedBatches = await getState<GeneratedBatch[]>('batches', []);
        const savedImagesData = await getState<SavedImageFile[]>('inputImages', []);

        if (savedPrompt !== undefined) setPrompt(savedPrompt);
        if (savedAspect) setAspectRatio(savedAspect);
        if (savedSize) setImageSize(savedSize);
        if (savedBatchSize) setBatchSize(savedBatchSize);
        if (savedModel) setModel(savedModel);
        if (savedThinking) setThinkingLevel(savedThinking);
        if (typeof savedSmart === 'boolean') setIsSmartAnalysis(savedSmart);
        if (savedOptMode === 'standard' || savedOptMode === 'aggressive') setOptimizationMode(savedOptMode);
        if (typeof savedDarkMode === 'boolean') setIsDarkMode(savedDarkMode);
        if (savedCurrency) setCurrency(savedCurrency);
        if (savedBatches && Array.isArray(savedBatches)) setBatches(savedBatches);

        if (savedImagesData && savedImagesData.length > 0) {
          const restoredFiles = savedImagesData.map(img => dataUrlToFile(img.dataUrl, img.name, img.type));
          setInputImages(restoredFiles);
        }
      } catch (e) {
        console.error("恢复本地持久化数据失败:", e);
      } finally {
        setIsInitialLoaded(true);
      }
    };

    initFromStorage();
  }, []);

  // 2. 状态改变时自动保存到持久化存储
  useEffect(() => {
    if (!isInitialLoaded) return;
    saveState('prompt', prompt);
  }, [prompt, isInitialLoaded]);

  useEffect(() => {
    if (!isInitialLoaded) return;
    saveState('aspectRatio', aspectRatio);
    saveState('imageSize', imageSize);
    saveState('batchSize', batchSize);
    saveState('model', model);
    saveState('thinkingLevel', thinkingLevel);
    saveState('isSmartAnalysis', isSmartAnalysis);
    saveState('optimizationMode', optimizationMode);
    saveState('isDarkMode', isDarkMode);
    saveState('currency', currency);
  }, [aspectRatio, imageSize, batchSize, model, thinkingLevel, isSmartAnalysis, optimizationMode, isDarkMode, currency, isInitialLoaded]);

  useEffect(() => {
    if (!isInitialLoaded) return;
    saveState('batches', batches);
  }, [batches, isInitialLoaded]);

  useEffect(() => {
    if (!isInitialLoaded) return;
    const syncImages = async () => {
      try {
        const imagesData = await Promise.all(
          inputImages.map(async (file) => ({
            name: file.name,
            type: file.type || 'image/png',
            dataUrl: await fileToDataUrl(file),
          }))
        );
        await saveState('inputImages', imagesData);
      } catch (e) {
        console.error("保存参考图失败:", e);
      }
    };
    syncImages();
  }, [inputImages, isInitialLoaded]);

  const handleClearAllRecords = async () => {
    setPrompt('');
    setInputImages([]);
    setBatches([]);
    setSelectedImage(null);
    setEditingImage(null);
    setError(null);
    await clearAllState();
    setShowClearConfirmModal(false);
    setToastMessage("已双重确认并成功清空所有提示词、参考图及图库记录！");
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);

    const cursorIndex = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorIndex);
    const match = textBeforeCursor.match(/@([^\s]*)$/);

    if (match) {
      setMentionState({
        isOpen: true,
        query: match[1],
        startIndex: match.index !== undefined ? match.index : -1
      });
    } else {
      setMentionState(null);
    }
  };

  const insertMention = (filename: string, fileBlob?: File) => {
    if (!mentionState) return;
    const before = prompt.slice(0, mentionState.startIndex);
    const after = prompt.slice(mentionState.startIndex + mentionState.query.length + 1);
    const newPrompt = `${before}@${filename} ${after}`;
    setPrompt(newPrompt);
    setMentionState(null);

    if (fileBlob) {
      setInputImages(prev => {
        if (!prev.some(f => f.name === fileBlob.name && f.size === fileBlob.size)) {
          return [...prev, fileBlob];
        }
        return prev;
      });
    }
    textareaRef.current?.focus();
  };

  const handleSelectHistoryImage = async (img: GeneratedImage) => {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const file = new File([blob], img.filename, { type: blob.type });
      insertMention(img.filename, file);
    } catch (err) {
      console.error("Failed to fetch image blob", err);
    }
  };

  const handleMentionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      insertMention(file.name, file);
    }
    if (e.target) e.target.value = '';
  };

  // 初始检查 API Key 状态
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        setHasKey(true); // 备选方案
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // 假设选择成功
    }
  };

  const handleOptimizePromptStandalone = async () => {
    const safePrompt = (prompt || "").trim();
    if (!safePrompt && inputImages.length === 0) {
      setToastMessage("请先输入待优化的提示词或添加参考图片");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsOptimizingPrompt(true);
    try {
      const result = await optimizePromptStandalone(safePrompt, inputImages, optimizationMode, thinkingLevel);
      if (result.optimizedPrompt) {
        setPrompt(result.optimizedPrompt);
        setToastMessage(`✨ 已按 Nano Banana Pro 规范完成优化 (${optimizationMode === 'aggressive' ? '强优化模式' : '标准优化模式'})`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      console.error("Standalone prompt optimization failed:", err);
      setToastMessage("提示词优化暂时遇到问题，请稍后重试");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    // 检查 Key
    if (model !== AIModel.Standard && !hasKey) {
       await handleOpenKey();
       return;
    }

    const safePrompt = (prompt || "").trim();
    if (!safePrompt && inputImages.length === 0) return setError("请提供文本描述或参考图片。");
    
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    startTimeRef.current = performance.now();
    const timer = setInterval(() => setElapsedTime((performance.now() - startTimeRef.current) / 1000), 100);

    try {
      const batchId = Date.now().toString();
      const currentBatchImages: GeneratedImage[] = [];
      const price = getPriceInfo(model, imageSize);

      for (let i = 0; i < batchSize; i++) {
        const batchProgressBase = (i / batchSize) * 100;
        const batchWeight = 100 / batchSize;
        setSteps([
          { id: 'prep', name: `分配渲染槽位 ${i+1}/${batchSize}`, status: 'active', duration: null },
          { id: 'env', name: '独立采样初始化', status: 'pending', duration: null },
          { id: 'render', name: `像素点阵计算`, status: 'pending', duration: null },
          { id: 'post', name: '画质后期优化', status: 'pending', duration: null },
        ]);

        const { structuraData, refinedPrompt, fileName, promptTranslation } = await analyzeAndName(
          safePrompt, inputImages, isSmartAnalysis, i, batchSize, thinkingLevel, optimizationMode
        );
        
        setProgress(batchProgressBase + (batchWeight * 0.2));
        setSteps(s => s.map(x => x.id === 'prep' ? {...x, status: 'done'} : x.id === 'env' ? {...x, status: 'active'} : x));

        const stepStart = performance.now();
        await new Promise(r => setTimeout(r, 200)); 
        setSteps(s => s.map(x => x.id === 'env' ? {...x, status: 'done'} : x.id === 'render' ? {...x, status: 'active'} : x));
        
        // 调用
        const urls = await generateSingleImage(refinedPrompt, inputImages, aspectRatio, imageSize, model, thinkingLevel);
        
        setProgress(batchProgressBase + (batchWeight * 0.85));
        setSteps(s => s.map(x => x.id === 'render' ? {...x, status: 'done'} : x.id === 'post' ? {...x, status: 'active'} : x));

        currentBatchImages.push({
          id: `${batchId}-${i}`, batchId, url: urls[0], prompt: safePrompt,
          refinedPrompt, promptTranslation, structuraData,
          filename: `${fileName}-${i + 1}`, timestamp: Date.now(),
          totalDuration: (performance.now() - stepStart) / 1000,
          thoughtLog: [], costRMB: price.rmb, costUSD: price.usd
        });
        
        setProgress(batchProgressBase + batchWeight);
      }

      setBatches(prev => [{ id: batchId, images: currentBatchImages, timestamp: Date.now(), totalCostRMB: price.rmb * batchSize, totalCostUSD: price.usd * batchSize }, ...prev]);
      setProgress(100);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API 凭证失效，请点击下方按钮重新授权。");
      } else {
        setError(err.message || "由于网络原因，渲染中断。");
      }
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
    }
  };

  const allImages = batches.flatMap(b => b.images);
  const currentPrice = getPriceInfo(model, imageSize);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row font-sans transition-all duration-500 overflow-hidden">
      
      <div 
        style={{ fontSize: `${uiScale * 100}%` }}
        className="w-full lg:w-[480px] p-6 flex flex-col gap-5 border-b lg:border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl z-40 lg:h-screen overflow-y-auto no-scrollbar shadow-2xl relative"
      >
        <div className="flex items-center justify-between sticky top-0 bg-inherit z-50 py-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-banana-500 rounded-2xl flex items-center justify-center text-slate-950 shadow-xl shadow-banana-500/30">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="font-black text-lg lg:text-xl tracking-tight leading-none text-slate-900 dark:text-white uppercase">Nano Lab <span className="text-banana-600 dark:text-banana-400">PRO</span></h1>
              <p className="text-[9px] text-slate-500 mt-1 font-black uppercase tracking-widest opacity-60">Aspect Optimized Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setShowClearConfirmModal(true)} 
               className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 border border-red-500/20 transition-all flex items-center justify-center"
               title="清空记录 (双重确认)"
             >
               <Trash2 size={18} />
             </button>
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-banana-500 hover:text-slate-950 transition-all">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          <div className="relative group">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMentionState(null);
              }}
              placeholder="输入灵感画面描述 (输入 @ 引用图片)..."
              className="w-full h-32 bg-slate-100/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 text-sm focus:border-banana-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none shadow-inner"
            />
            
            {mentionState && mentionState.isOpen && (
              <div className="absolute z-20 left-4 top-16 w-64 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-black text-slate-400 uppercase px-2 mb-2 tracking-widest">插入图片至参考区</div>
                
                <input 
                  type="file" 
                  ref={mentionFileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/webp, image/heic, image/heif" 
                  onChange={handleMentionFileUpload} 
                />
                <button onClick={() => mentionFileInputRef.current?.click()} className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-3 transition-all group">
                   <div className="p-1.5 bg-banana-500/10 group-hover:bg-banana-500 text-banana-600 group-hover:text-slate-900 rounded-lg transition-all"><ImageIcon size={16} /></div>
                   <span className="font-bold text-slate-700 dark:text-slate-200">上传新图片...</span>
                </button>
                
                {inputImages.length > 0 && (
                  <>
                    <div className="text-[10px] font-black text-slate-400 uppercase px-2 mt-4 mb-2 tracking-widest">已选参考图</div>
                    <div className="space-y-1">
                      {inputImages.filter(img => img.name.toLowerCase().includes(mentionState.query.toLowerCase())).map((img, i) => (
                        <button key={i} onClick={() => insertMention(img.name)} className="w-full text-left px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-3 transition-all">
                          <img src={URL.createObjectURL(img)} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shadow-sm" alt={img.name} />
                          <span className="truncate flex-1 text-xs font-medium text-slate-700 dark:text-slate-300">{img.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {allImages.length > 0 && (
                  <>
                    <div className="text-[10px] font-black text-slate-400 uppercase px-2 mt-4 mb-2 tracking-widest">历史生成记录</div>
                    <div className="space-y-1">
                      {allImages.filter(img => img.filename.toLowerCase().includes(mentionState.query.toLowerCase())).slice(0, 8).map(img => (
                        <button key={img.id} onClick={() => handleSelectHistoryImage(img)} className="w-full text-left px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-3 transition-all">
                          <img src={img.url} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shadow-sm" />
                          <span className="truncate flex-1 text-xs font-medium text-slate-700 dark:text-slate-300">{img.filename}</span>
                        </button>
                      ))}
                      {allImages.filter(img => img.filename.toLowerCase().includes(mentionState.query.toLowerCase())).length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-2">无匹配项</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
               {/* 一键优化按钮：直接将当前文本编译为 Nano Banana Pro 英文 Prompt */}
               <button 
                 type="button"
                 onClick={handleOptimizePromptStandalone} 
                 disabled={isGenerating || isOptimizingPrompt || (!prompt.trim() && inputImages.length === 0)}
                 title="根据 Nano Banana Pro 规范直接编译当前提示词"
                 className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-banana-50 dark:hover:bg-banana-950/30 hover:border-banana-400 transition-all text-[10px] font-black tracking-wider disabled:opacity-40"
               >
                 {isOptimizingPrompt ? <Loader2 size={12} className="animate-spin text-banana-500" /> : <Sparkles size={12} className="text-banana-500" />}
                 <span>{isOptimizingPrompt ? "编译中..." : "一键优化"}</span>
               </button>

               {/* 提示词优化开关与模式切换 */}
               <div className="flex items-center bg-white/90 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                 <button 
                   type="button"
                   onClick={() => setIsSmartAnalysis(!isSmartAnalysis)} 
                   className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider ${
                     isSmartAnalysis ? 'bg-banana-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                   }`}
                 >
                   <Wand2 size={11} /> {isSmartAnalysis ? "优化 ON" : "优化 OFF"}
                 </button>

                 {isSmartAnalysis && (
                   <button
                     type="button"
                     onClick={() => setOptimizationMode(prev => prev === 'standard' ? 'aggressive' : 'standard')}
                     title="点击切换：标准优化 (Standard) / 强优化 (Aggressive)"
                     className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                   >
                     {optimizationMode === 'aggressive' ? (
                       <span className="flex items-center gap-1 text-orange-500">
                         <Flame size={11} /> 强优化
                       </span>
                     ) : (
                       <span className="flex items-center gap-1 text-banana-600 dark:text-banana-400">
                         <Sparkles size={11} /> 标准
                       </span>
                     )}
                   </button>
                 )}
               </div>
            </div>
          </div>

          <ImageUploader files={inputImages} onFilesChange={setInputImages} disabled={isGenerating} onEdit={(file) => setEditingImage({ url: URL.createObjectURL(file), name: file.name, type: 'local' })} />
          
          <SettingsPanel 
            aspectRatio={aspectRatio}
            imageSize={imageSize}
            batchSize={batchSize}
            model={model}
            isSmartAnalysis={isSmartAnalysis}
            optimizationMode={optimizationMode}
            thinkingLevel={thinkingLevel}
            onAspectRatioChange={setAspectRatio}
            onImageSizeChange={setImageSize}
            onBatchSizeChange={setBatchSize}
            onModelChange={setModel}
            onSmartAnalysisChange={setIsSmartAnalysis}
            onOptimizationModeChange={setOptimizationMode}
            onThinkingLevelChange={setThinkingLevel}
            disabled={isGenerating} 
          />

          {model !== AIModel.Standard && !hasKey && (
            <button onClick={handleOpenKey} className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-[1.8rem] flex items-center justify-between group hover:bg-red-500/20 transition-all">
               <div className="flex items-center gap-3 text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest"><Key size={16}/> 需要 API Key 授权</div>
               <div className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold">立即选择</div>
            </button>
          )}
        </div>

        {error && <div className="text-red-600 dark:text-red-400 text-[11px] font-bold bg-red-50 dark:bg-red-900/40 p-4 rounded-2xl border border-red-200">⚠️ {error}</div>}

        <div className="pt-2">
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-6 bg-gradient-to-br from-banana-400 to-banana-600 text-slate-950 font-black text-lg rounded-[2.2rem] shadow-2xl transition-all disabled:opacity-40 active:scale-95 flex flex-col items-center justify-center">
             <div className="flex items-center gap-3">
               {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
               <span>{isGenerating ? `正在渲染艺术品...` : `开启艺术创作`}</span>
             </div>
             {!isGenerating && <span className="text-[9px] font-black opacity-80 uppercase mt-1 tracking-widest">预计成本 {currency === 'RMB' ? `¥ ${currentPrice.rmb}` : `$ ${currentPrice.usd}`} / 张</span>}
          </button>

          {isGenerating && (
            <div className="mt-4 p-5 bg-white dark:bg-slate-800/80 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl">
               <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                 <span>生成进度 {Math.round(progress)}%</span>
                 <span className="font-mono text-banana-600">{elapsedTime.toFixed(1)}s</span>
               </div>
               <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                 <div className="h-full bg-banana-500 transition-all duration-500" style={{ width: `${progress}%` }} />
               </div>
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 p-5 lg:p-14 overflow-y-auto lg:h-screen scroll-smooth bg-slate-50 dark:bg-slate-950 transition-all duration-700 ${selectedImage || editingImage ? 'blur-xl brightness-50 pointer-events-none' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 lg:mb-16">
            <div>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                <div className="p-3 bg-banana-500/10 rounded-[1.5rem]"><ImageIcon className="text-banana-500" size={28} /></div>
                图库
                {allImages.length > 0 && (
                  <span className="text-xs font-bold px-3.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                    {allImages.length} 张作品
                  </span>
                )}
              </h2>
            </div>
            {(allImages.length > 0 || prompt || inputImages.length > 0) && (
              <button
                onClick={() => setShowClearConfirmModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 border border-red-500/20 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-sm"
              >
                <Trash2 size={16} />
                <span>清除记录 (双重确认)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {allImages.map((img) => (
              <div 
                key={img.id} 
                className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl cursor-pointer transition-all"
                onClick={() => setSelectedImage(img)}
              >
                <div className="aspect-[4/5] relative">
                  <img src={img.url} className="w-full h-full object-cover" />
                  
                  {/* 下载按钮 - 右下角悬浮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement('a');
                      link.href = img.url;
                      link.download = `${img.filename}.png`;
                      link.click();
                    }}
                    className="absolute bottom-4 right-4 p-3 bg-banana-500 hover:bg-banana-400 text-slate-950 rounded-xl shadow-xl transition-all scale-0 group-hover:scale-100 z-10 active:scale-90"
                    title="下载图片"
                  >
                    <Download size={18} strokeWidth={3} />
                  </button>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-6 flex flex-col justify-end">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{img.filename}</p>
                    <p className="text-white text-xs font-bold line-clamp-1 italic pr-10">"{img.prompt}"</p>
                  </div>
                </div>
              </div>
            ))}
            {allImages.length === 0 && !isGenerating && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                    <Sparkles size={48} className="opacity-20 text-banana-600 mb-6" />
                    <p className="text-lg font-black opacity-40">图库尚无作品记录</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {selectedImage && <ImageViewer image={selectedImage} isCopied={!!copyStatus[selectedImage.id]} onClose={() => setSelectedImage(null)} onCopy={() => {}} onNext={() => {}} onPrev={() => {}} onEdit={() => {}} currency={currency} />}
      {editingImage && <ImageEditor image={editingImage} onClose={() => setEditingImage(null)} onDone={() => {}} />}

      {/* 提示消息 Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[110] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300">
          <Check size={18} className="text-banana-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 双重确认清除模态框 */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowClearConfirmModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">确认清除所有记录？</h3>
                <p className="text-xs text-slate-500 mt-0.5">二次确认提醒：此操作不可撤销</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p className="font-bold text-slate-900 dark:text-slate-100">以下保存的全部数据将被完全清空：</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                <li>输入的灵感提示词文本</li>
                <li>已上传的 {inputImages.length} 张参考图像</li>
                <li>图库中的 {allImages.length} 张历史生成作品</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all"
              >
                取消
              </button>
              <button
                onClick={handleClearAllRecords}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Trash2 size={16} />
                确认双重清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
