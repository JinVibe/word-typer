import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

function pickPdfs(list: FileList | null): File[] {
  if (!list) return [];
  return Array.from(list).filter(
    (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name),
  );
}

export function PdfDropzone({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const files = pickPdfs(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = pickPdfs(e.target.files);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={[
        'flex h-56 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors select-none',
        over ? 'border-[#F2F2F2] bg-[#1a1a1a]' : 'border-[#3a3a3a] hover:border-[#5a5a5a]',
        disabled ? 'cursor-default opacity-50' : '',
      ].join(' ')}
    >
      <p className="text-lg text-[#F2F2F2]">PDF들을 여기에 드롭</p>
      <p className="text-sm text-[#8A8A8A]">또는 클릭해서 파일 선택</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
