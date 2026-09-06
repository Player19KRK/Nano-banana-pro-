
import React, { useState, useMemo } from 'react';
import { AspectRatio, ImageSize, AIModel, OptimizationMode } from '../types';
import { Cpu, BrainCircuit, Layout, Layers, Monitor, Smartphone, Monitor as MonitorIcon, CheckCircle2, Brain, Sparkles, Flame } from 'lucide-react';

interface SettingsPanelProps {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  batchSize: number;
  model: AIModel;
  isSmartAnalysis: boolean;
  optimizationMode: OptimizationMode;
  thinkingLevel: 'HIGH' | 'LOW';
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onImageSizeChange: (size: ImageSize) => void;
  onBatchSizeChange: (size: number) => void;
  onModelChange: (model: AIModel) => void;
  onSmartAnalysisChange: (enabled: boolean) => void;
  onOptimizationModeChange: (mode: OptimizationMode) => void;
  onThinkingLevelChange: (level: 'HIGH' | 'LOW') => void;
  disabled: boolean;
}

type Orientation = 'landscape' | 'portrait';

const landscapeRatios = [
  { label: "21:9 宽画幅", value: AspectRatio.Ratio_21_9 },
  { label: "16:9 现代", value: AspectRatio.Ratio_16_9 },
  { label: "3:2 经典", value: AspectRatio.Ratio_3_2 },
  { label: "4:3 复古", value: AspectRatio.Ratio_4_3 },
  { label: "5:4 传统", value: AspectRatio.Ratio_5_4 },
  { label: "1:1 正方形", value: AspectRatio.Square },
];

const portraitRatios = [
  { label: "1:1 正方形", value: AspectRatio.Square },
  { label: "4:5 社交", value: AspectRatio.Ratio_4_5 },
  { label: "2:3 海报", value: AspectRatio.Ratio_2_3 },
  { label: "3:4 杂志", value: AspectRatio.Ratio_3_4 },
  { label: "9:16 全屏", value: AspectRatio.Ratio_9_16 },
  { label: "9:21 超长屏", value: AspectRatio.Ratio_9_21 },
];

const AspectRatioBox = ({ ratio, active }: { ratio: string, active: boolean }) => {
  const [w, h] = ratio.split(':').map(Number);
  const max = Math.max(w, h);
  const width = (w / max) * 100;
  const height = (h / max) * 100;
  return (
    <div className="flex items-center justify-center w-4 h-4 mr-2">
      <div 
        className={`border-[1.5px] rounded-[1px] transition-all duration-300 ${active ? 'border-banana-600 bg-banana-500/40 shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'border-slate-400 dark:border-slate-600'}`}
        style={{ width: `${width}%`, height: `${height}%` }}
      />
    </div>
  );
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  aspectRatio, imageSize, batchSize, model, isSmartAnalysis, optimizationMode, thinkingLevel,
  onAspectRatioChange, onImageSizeChange, onBatchSizeChange, onModelChange,
  onSmartAnalysisChange, onOptimizationModeChange, onThinkingLevelChange,
  disabled
}) => {
  // 根据当前选择的比例计算初始方向，默认景观
  const initialOrientation: Orientation = useMemo(() => {
    if (portraitRatios.some(r => r.value === aspectRatio && r.value !== AspectRatio.Square)) return 'portrait';
    return 'landscape';
  }, [aspectRatio]);

  const [orientation, setOrientation] = useState<Orientation>(initialOrientation);

  const handleOrientationChange = (o: Orientation) => {
    setOrientation(o);
    // 切换分类时，如果当前比例不属于该分类，则选择该分类的首个
    if (o === 'landscape' && !landscapeRatios.some(r => r.value === aspectRatio)) {
        onAspectRatioChange(AspectRatio.Ratio_16_9);
    } else if (o === 'portrait' && !portraitRatios.some(r => r.value === aspectRatio)) {
        onAspectRatioChange(AspectRatio.Ratio_9_16);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/40 rounded-[2.5rem] p-5 border border-slate-200 dark:border-slate-700/50 space-y-6 backdrop-blur-sm shadow-sm">
      {/* 引擎与分析 */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
             <label className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-2 px-1 tracking-widest">
              <Cpu size={12} /> AI模型
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/30">
              {[AIModel.Standard, AIModel.NanoBanana2, AIModel.Pro].map(m => (
                <button
                  key={m} disabled={disabled} onClick={() => onModelChange(m)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                    model === m ? 'bg-banana-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {m === AIModel.Pro ? 'Pro' : m === AIModel.NanoBanana2 ? 'Nano 2' : 'Std'}
                </button>
              ))}
            </div>
          </div>
          
          {model === AIModel.NanoBanana2 && (
            <div className="flex-1 space-y-2">
               <label className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-2 px-1 tracking-widest">
                <Brain size={12} /> 思考模式
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/30">
                <button
                  disabled={disabled} onClick={() => onThinkingLevelChange('HIGH')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                    thinkingLevel === 'HIGH' ? 'bg-banana-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  High
                </button>
                <button
                  disabled={disabled} onClick={() => onThinkingLevelChange('LOW')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                    thinkingLevel === 'LOW' ? 'bg-banana-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Low
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 space-y-2">
             <label className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-2 px-1 tracking-widest">
              <BrainCircuit size={12} /> 提示词优化
            </label>
            <button
              disabled={disabled} onClick={() => onSmartAnalysisChange(!isSmartAnalysis)}
              className={`w-full py-2.5 px-3 rounded-2xl border text-[10px] font-black transition-all ${isSmartAnalysis ? 'bg-banana-500/10 border-banana-500/30 text-banana-600' : 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/30 text-slate-500'}`}
            >
              {isSmartAnalysis ? '开启' : '关闭'}
            </button>
          </div>
        </div>

        {/* 提示词优化模式选择器 (Standard vs Aggressive) */}
        {isSmartAnalysis && (
          <div className="bg-slate-50/80 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles size={11} className="text-banana-500" />
                <span>Nano Optimizer 模式</span>
              </label>
              <span className="text-[9px] text-slate-400">
                {optimizationMode === 'standard' ? '紧扣原意 · 精细光影与细节' : '深度重构 · 顶级商业视觉'}
              </span>
            </div>
            
            <div className="flex bg-slate-200/60 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onOptimizationModeChange('standard')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${
                  optimizationMode === 'standard'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Sparkles size={12} className={optimizationMode === 'standard' ? 'text-banana-500' : ''} />
                <span>标准优化 (Standard)</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onOptimizationModeChange('aggressive')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${
                  optimizationMode === 'aggressive'
                    ? 'bg-banana-500 text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Flame size={12} className={optimizationMode === 'aggressive' ? 'text-slate-950' : 'text-orange-500'} />
                <span>强优化 (Aggressive)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 比例选择 - 极简分类 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase flex items-center gap-2">
             <Layout size={14} /> 比例
           </label>
        </div>

        {/* 顶部方向切换 (去掉了方正) */}
        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/30">
          <button onClick={() => handleOrientationChange('landscape')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${orientation === 'landscape' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
            <MonitorIcon size={14} /> 横向场景
          </button>
          <button onClick={() => handleOrientationChange('portrait')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${orientation === 'portrait' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
            <Smartphone size={14} /> 纵向肖像
          </button>
        </div>

        {/* 比例选项列表 */}
        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="grid grid-cols-2 gap-2">
            {(orientation === 'landscape' ? landscapeRatios : portraitRatios).map((r) => (
              <button 
                key={r.value} onClick={() => onAspectRatioChange(r.value)} 
                className={`flex items-center py-3 px-3 rounded-2xl border text-[10px] font-bold transition-all ${aspectRatio === r.value ? 'bg-banana-500/10 border-banana-500 text-banana-600' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'}`}
              >
                <AspectRatioBox ratio={r.value} active={aspectRatio === r.value} /> {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 底部数量控制 */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-5">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase flex items-center gap-2"><Layers size={14} /> 批量生成</label>
            <span className="text-banana-600 dark:text-banana-400 font-black text-[11px] bg-banana-500/10 px-3 py-1 rounded-xl">{batchSize} 张</span>
          </div>
          <input type="range" min="1" max="10" step="1" value={batchSize} disabled={disabled} onChange={(e) => onBatchSizeChange(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full appearance-none cursor-pointer accent-banana-500" />
        </div>
        
        {model !== AIModel.Standard && (
           <div className="space-y-2">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase flex items-center gap-2 px-1 tracking-widest">
                <Monitor size={12} /> 分辨率
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/30">
                {[ImageSize.Size_1K, ImageSize.Size_2K, ImageSize.Size_4K].map(s => (
                  <button
                    key={s} disabled={disabled} onClick={() => onImageSizeChange(s)}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${
                      imageSize === s ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-950 shadow-md' : 'text-slate-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
