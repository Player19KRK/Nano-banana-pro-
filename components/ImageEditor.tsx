
import React, { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore
import { fabric } from 'https://esm.sh/fabric@5.3.0';
import { 
  X, Pencil, Type as TypeIcon, Square, MousePointer2, 
  Download, Copy, Check, Send, Undo2, RotateCcw, 
  Trash2, Edit3, Minus, Plus, Maximize, Hand 
} from 'lucide-react';
import { EditingImage } from '../types';

interface ImageEditorProps {
  image: EditingImage;
  onClose: () => void;
  onDone: (blob: Blob) => void;
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#facc15', 
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
];

const TOOLS = [
  { id: 'select', icon: MousePointer2, name: '选择' },
  { id: 'pencil', icon: Pencil, name: '画笔' },
  { id: 'text', icon: TypeIcon, name: '文字 (双击添加)' },
  { id: 'rect', icon: Square, name: '方框' },
  { id: 'pan', icon: Hand, name: '抓手 (Alt+拖拽)' }
];

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onClose, onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const isHandlingHistory = useRef(false);
  
  const [activeTool, setActiveTool] = useState('pencil');
  const [activeColor, setActiveColor] = useState('#facc15');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [fontSize, setFontSize] = useState(40);
  const [isCopied, setIsCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  // 辅助变量用于交互
  const isMouseDown = useRef(false);
  const rectRef = useRef<fabric.Rect | null>(null);
  const startPoint = useRef<{ x: number, y: number } | null>(null);

  // 保存历史记录
  const saveHistory = useCallback(() => {
    if (!fabricRef.current || isHandlingHistory.current) return;
    const json = JSON.stringify(fabricRef.current.toDatalessJSON());
    if (historyRef.current[historyRef.current.length - 1] !== json) {
      historyRef.current.push(json);
      if (historyRef.current.length > 30) historyRef.current.shift();
      setCanUndo(historyRef.current.length > 1);
    }
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length <= 1 || !fabricRef.current) return;
    isHandlingHistory.current = true;
    historyRef.current.pop();
    const lastState = historyRef.current[historyRef.current.length - 1];
    
    fabricRef.current.loadFromJSON(lastState, () => {
      fabricRef.current?.renderAll();
      setCanUndo(historyRef.current.length > 1);
      isHandlingHistory.current = false;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      const filtered = active.filter(obj => obj.type !== 'image');
      canvas.remove(...filtered);
      canvas.discardActiveObject().renderAll();
      saveHistory();
    }
  }, [saveHistory]);

  const resetZoom = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setZoom(1);
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    canvas.requestRenderAll();
  }, []);

  // 初始化画布
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth * 0.85,
      height: window.innerHeight * 0.8,
      backgroundColor: '#0a0c10',
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      fireRightClick: true,
      stopContextMenu: true,
    });
    fabricRef.current = canvas;

    // 加载图片底图
    fabric.Image.fromURL(image.url, (img) => {
      if (!img) return;
      const canvasW = canvas.getWidth();
      const canvasH = canvas.getHeight();
      const imgW = img.width || 0;
      const imgH = img.height || 0;
      
      if (imgW && imgH) {
        const scale = Math.min(canvasW / imgW, canvasH / imgH) * 0.95;
        img.set({
          selectable: false,
          evented: false,
          scaleX: scale,
          scaleY: scale,
          left: (canvasW - imgW * scale) / 2,
          top: (canvasH - imgH * scale) / 2,
          hoverCursor: 'default'
        });
        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();
        saveHistory();
      }
    }, { crossOrigin: 'anonymous' });

    // 滚轮缩放
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.05) zoom = 0.05;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // 对象修改监听
    canvas.on('object:modified', saveHistory);
    canvas.on('path:created', saveHistory);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObject();
        if (active && (active as any).isEditing) return;
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
    };
  }, [image.url, saveHistory, undo, deleteSelected]);

  // 工具逻辑管理
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    canvas.off('mouse:dblclick');

    canvas.isDrawingMode = activeTool === 'pencil';
    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = activeTool === 'pan' ? 'grab' : (activeTool === 'text' ? 'text' : 'default');

    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    }

    // 双击添加文本
    canvas.on('mouse:dblclick', (opt) => {
      if (activeTool === 'text' && !opt.target) {
        const pointer = canvas.getPointer(opt.e);
        const text = new fabric.IText('输入文本...', {
          left: pointer.x,
          top: pointer.y,
          fill: activeColor,
          fontSize: fontSize,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        saveHistory();
      }
    });

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      const pointer = canvas.getPointer(opt.e);

      // 平移逻辑 (抓手工具 或 按住 Alt)
      if (activeTool === 'pan' || evt.altKey || opt.button === 2) {
        isMouseDown.current = true;
        canvas.setCursor('grabbing');
        startPoint.current = { x: evt.clientX, y: evt.clientY };
        return;
      }

      // 矩形绘制
      if (activeTool === 'rect') {
        isMouseDown.current = true;
        startPoint.current = { x: pointer.x, y: pointer.y };
        rectRef.current = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: strokeWidth,
          selectable: true,
          rx: 4, ry: 4
        });
        canvas.add(rectRef.current);
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isMouseDown.current) return;
      const evt = opt.e as MouseEvent;
      const pointer = canvas.getPointer(opt.e);

      // 执行平移
      if (startPoint.current && (activeTool === 'pan' || evt.altKey || !rectRef.current)) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - startPoint.current.x;
          vpt[5] += evt.clientY - startPoint.current.y;
          canvas.requestRenderAll();
          startPoint.current = { x: evt.clientX, y: evt.clientY };
        }
        return;
      }

      // 执行矩形拉伸
      if (activeTool === 'rect' && rectRef.current && startPoint.current) {
        const width = Math.abs(startPoint.current.x - pointer.x);
        const height = Math.abs(startPoint.current.y - pointer.y);
        rectRef.current.set({
          width,
          height,
          left: Math.min(startPoint.current.x, pointer.x),
          top: Math.min(startPoint.current.y, pointer.y)
        });
        canvas.requestRenderAll();
      }
    });

    canvas.on('mouse:up', () => {
      if (activeTool === 'rect' && rectRef.current) {
        if (rectRef.current.width! < 2 && rectRef.current.height! < 2) {
          canvas.remove(rectRef.current);
        } else {
          saveHistory();
        }
      }
      isMouseDown.current = false;
      rectRef.current = null;
      startPoint.current = null;
      canvas.setCursor(activeTool === 'pan' ? 'grab' : (activeTool === 'text' ? 'text' : 'default'));
    });

  }, [activeTool, activeColor, strokeWidth, fontSize, saveHistory]);

  // 属性同步到选中物体
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => {
        if (obj.type === 'i-text') {
          obj.set({ fill: activeColor, fontSize });
        } else if (obj.type === 'rect' || obj.type === 'path') {
          obj.set({ stroke: activeColor, strokeWidth });
        }
      });
      canvas.requestRenderAll();
    }
  }, [activeColor, fontSize, strokeWidth]);

  const handleExport = async (mode: 'done' | 'download' | 'copy') => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const originalZoom = canvas.getZoom();
    const originalVpt = [...(canvas.viewportTransform || [1,0,0,1,0,0])];

    canvas.setZoom(1);
    canvas.absolutePan({ x: 0, y: 0 });
    canvas.discardActiveObject();
    canvas.renderAll();

    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1 });

    canvas.viewportTransform = originalVpt as any;
    canvas.setZoom(originalZoom);
    canvas.renderAll();

    if (mode === 'download') {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `nano-studio-${Date.now()}.png`;
      a.click();
    } else if (mode === 'copy') {
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      onDone(blob);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/98 backdrop-blur-3xl animate-in fade-in duration-300 overflow-hidden select-none">
      {/* 顶部控制栏 */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-50">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-banana-500 rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
            <Edit3 size={24} />
          </div>
          <div>
            <h2 className="text-white font-black text-sm uppercase tracking-[0.2em]">Nano Studio <span className="text-banana-500">PRO</span></h2>
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest mt-0.5 opacity-60">Creative Canvas Engine V2.5</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-1.5 flex gap-1 border border-white/5 shadow-2xl">
            <button onClick={undo} disabled={!canUndo} className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-10" title="撤销 (Ctrl+Z)"><Undo2 size={20} /></button>
            <button onClick={resetZoom} className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all" title="重置视图"><Maximize size={20} /></button>
            <button onClick={() => { if(confirm('清空所有标注？')) { fabricRef.current?.getObjects().forEach(o => o.type !== 'image' && fabricRef.current?.remove(o)); saveHistory(); } }} className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all" title="清空标注"><RotateCcw size={20} /></button>
          </div>
          <button onClick={onClose} className="p-4 bg-white/5 hover:bg-red-500/20 rounded-2xl text-white transition-all border border-white/5 shadow-xl group">
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* 左侧属性调节器 */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4 bg-slate-900/90 backdrop-blur-3xl p-5 rounded-[3rem] border border-white/5 shadow-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase vertical-text tracking-widest">Stroke</span>
          <div className="flex flex-col gap-4 items-center h-44 py-2">
            <button onClick={() => setStrokeWidth(s => Math.min(s + 2, 100))} className="p-1 text-slate-400 hover:text-white transition-colors"><Plus size={16}/></button>
            <div className="flex-1 w-1.5 bg-slate-800/50 rounded-full relative overflow-hidden">
               <div className="absolute bottom-0 inset-x-0 bg-banana-500 transition-all duration-300" style={{ height: `${(strokeWidth / 100) * 100}%` }} />
               <input type="range" min="1" max="100" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" />
            </div>
            <button onClick={() => setStrokeWidth(s => Math.max(s - 2, 1))} className="p-1 text-slate-400 hover:text-white transition-colors"><Minus size={16}/></button>
          </div>
          <div className="text-[10px] font-mono text-banana-400 font-black bg-white/5 px-2 py-1 rounded-lg">{strokeWidth}</div>
        </div>

        <div className="flex flex-col items-center gap-4 bg-slate-900/90 backdrop-blur-3xl p-5 rounded-[3rem] border border-white/5 shadow-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase vertical-text tracking-widest">Font</span>
          <div className="flex flex-col gap-4 items-center h-44 py-2">
            <button onClick={() => setFontSize(s => Math.min(s + 5, 400))} className="p-1 text-slate-400 hover:text-white transition-colors"><Plus size={16}/></button>
            <div className="flex-1 w-1.5 bg-slate-800/50 rounded-full relative">
               <div className="absolute bottom-0 inset-x-0 bg-banana-500 transition-all" style={{ height: `${(fontSize / 400) * 100}%` }} />
               <input type="range" min="10" max="400" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" />
            </div>
            <button onClick={() => setFontSize(s => Math.max(s - 5, 10))} className="p-1 text-slate-400 hover:text-white transition-colors"><Minus size={16}/></button>
          </div>
          <div className="text-[10px] font-mono text-banana-400 font-black bg-white/5 px-2 py-1 rounded-lg">{fontSize}</div>
        </div>
      </div>

      {/* 主画布容器 */}
      <div className="relative group rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_60px_150px_-30px_rgba(0,0,0,0.9)] bg-slate-950">
        <canvas ref={canvasRef} />
      </div>

      {/* 右侧工具组 */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50">
        <div className="bg-slate-900/95 backdrop-blur-3xl p-4 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col gap-4">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`p-4.5 rounded-[2rem] transition-all duration-300 ${activeTool === t.id ? 'bg-banana-500 text-slate-950 shadow-[0_10px_30px_rgba(234,179,8,0.4)] scale-110' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}
              title={t.name}
            >
              <t.icon size={26} strokeWidth={2.5} />
            </button>
          ))}
          <div className="h-px bg-white/10 mx-3" />
          <button onClick={deleteSelected} className="p-4.5 rounded-[2rem] text-red-500/40 hover:text-red-400 hover:bg-red-400/10 transition-all" title="删除选中 (Del)">
            <Trash2 size={26} />
          </button>
        </div>

        <div className="bg-slate-900/95 backdrop-blur-3xl p-6 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col gap-4 items-center">
          <div className="grid grid-cols-2 gap-3.5">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${activeColor === c ? 'border-white scale-125 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'border-white/5 hover:border-white/20'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Palette</span>
        </div>
      </div>

      {/* 底部操作条 */}
      <div className="absolute bottom-10 flex gap-8 items-center z-50 animate-in slide-in-from-bottom-8">
        <div className="bg-slate-900/90 backdrop-blur-3xl p-3.5 rounded-[4rem] border border-white/5 shadow-2xl flex gap-3">
          <button onClick={() => handleExport('copy')} className={`px-12 py-5.5 rounded-full flex items-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${isCopied ? 'bg-green-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
            {isCopied ? <Check size={18} /> : <Copy size={18} />} {isCopied ? '已复制图层' : '复制图层'}
          </button>
          <button onClick={() => handleExport('download')} className="px-12 py-5.5 rounded-full flex items-center gap-3 text-slate-300 hover:bg-white/10 font-black text-[11px] uppercase tracking-widest transition-all">
            <Download size={18} /> 下载 PNG
          </button>
        </div>

        <button 
          onClick={() => handleExport('done')}
          className="bg-banana-500 hover:bg-banana-400 text-slate-950 px-16 py-7 rounded-full shadow-[0_30px_80px_-15px_rgba(234,179,8,0.5)] font-black text-base uppercase tracking-[0.3em] flex items-center gap-6 transition-all hover:scale-105 active:scale-95 group"
        >
          <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
          确认编辑同步
        </button>
      </div>
      
      <style>{`
        .vertical-text { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
        input[type="range"] { -webkit-appearance: none; background: transparent; }
        .canvas-container { border-radius: 3rem; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8); }
        ::selection { background: #eab308; color: #000; }
      `}</style>
    </div>
  );
};

export default ImageEditor;
