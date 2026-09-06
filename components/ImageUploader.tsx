
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Upload, X, ImagePlus, ClipboardPaste, AlertCircle, Edit3, Plus } from 'lucide-react';

interface ImageUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled: boolean;
  onEdit: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ files, onFilesChange, disabled, onEdit }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 监听全局粘贴事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      const newFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            if (!file.name || file.name === 'image.png') {
                const timestamp = new Date().getTime();
                const ext = file.type.split('/')[1] || 'png';
                const renamedFile = new File([file], `paste-${timestamp}.${ext}`, { type: file.type });
                newFiles.push(renamedFile);
            } else {
                newFiles.push(file);
            }
          }
        }
      }

      if (newFiles.length > 0) {
        e.preventDefault(); 
        onFilesChange([...files, ...newFiles]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [files, disabled, onFilesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = (Array.from(e.dataTransfer.files) as File[]).filter(file => file.type.startsWith('image/'));
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, onFilesChange, disabled]);

  const handleRemoveClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (confirmingIdx === index) {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      onFilesChange(newFiles);
      setConfirmingIdx(null);
    } else {
      setConfirmingIdx(index);
      setTimeout(() => {
        setConfirmingIdx(current => current === index ? null : current);
      }, 3000);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newFiles = (Array.from(e.target.files) as File[]).filter(file => file.type.startsWith('image/'));
        onFilesChange([...files, ...newFiles]);
        // 重置 input 的 value，以便可以重复上传相同文件
        e.target.value = '';
    }
  };

  const triggerUpload = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3" onClick={() => setConfirmingIdx(null)}>
      <div className="flex items-center justify-between text-sm text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-widest"><ImagePlus size={16}/> 参考图片 ({files.length})</span>
        <span className="text-[10px] opacity-60 font-medium">支持拖拽或粘贴</span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          // 如果点击的是容器背景而非已有图片的按钮，触发上传
          if (e.target === e.currentTarget) triggerUpload();
        }}
        className={`relative border-2 border-dashed rounded-[2rem] transition-all duration-200 min-h-[140px] flex flex-col items-center justify-center p-6 group
          ${isDragging 
            ? 'border-banana-500 bg-banana-500/10' 
            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-banana-500/50 hover:bg-white dark:hover:bg-slate-800/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* 隐藏的真实 Input */}
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileInput} 
          disabled={disabled} 
        />

        {files.length === 0 ? (
          <div className="text-center pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:text-banana-500 transition-colors">
              <Upload size={24} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">点击或拖拽上传</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 flex items-center justify-center gap-1.5">
               <ClipboardPaste size={12}/> 支持 Ctrl+V 直接粘贴
            </p>
          </div>
        ) : (
            <div className="w-full relative z-10">
                <div className="flex flex-wrap gap-3 justify-center">
                    {files.map((file, idx) => (
                    <div key={idx} className={`relative w-24 h-24 rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 ${confirmingIdx === idx ? 'ring-2 ring-red-500 scale-95' : 'border-white dark:border-slate-700 group/img'}`}>
                        <img src={URL.createObjectURL(file)} alt="preview" className={`w-full h-full object-cover transition-all ${confirmingIdx === idx ? 'blur-[2px] brightness-50' : ''}`} />
                        
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col gap-1 p-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(file); }}
                            className="w-full flex-1 bg-banana-500/90 hover:bg-banana-500 text-slate-900 rounded-xl flex items-center justify-center transition-colors"
                            title="编辑图片"
                          >
                            <Edit3 size={16} strokeWidth={3} />
                          </button>
                          <button 
                            onClick={(e) => handleRemoveClick(e, idx)} 
                            className={`w-full flex-1 rounded-xl flex items-center justify-center transition-all ${
                              confirmingIdx === idx 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'bg-slate-900/80 text-white hover:bg-red-500'
                            }`}
                            title={confirmingIdx === idx ? "确认删除？" : "移除图片"}
                          >
                              {confirmingIdx === idx ? <AlertCircle size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                          </button>
                        </div>

                        {confirmingIdx === idx && (
                          <div className="absolute bottom-1 inset-x-1 flex items-center justify-center pointer-events-none">
                             <span className="text-[7px] font-black text-white uppercase tracking-tighter bg-red-500/80 px-1 py-0.5 rounded-full">再次点击</span>
                          </div>
                        )}
                    </div>
                    ))}
                    
                    {/* 添加更多按钮 */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); triggerUpload(); }}
                      className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 hover:border-banana-500 hover:text-banana-500 transition-all group/add"
                    >
                        <Plus size={24} className="group-hover/add:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-tighter mt-1">添加更多</span>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
