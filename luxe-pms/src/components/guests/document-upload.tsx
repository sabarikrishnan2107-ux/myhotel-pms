"use client";
import * as React from "react";
import Image from "next/image";
import { FileImage, X, CheckCircle2 } from "lucide-react";

interface Props {
  label: string;
  onChange?: (dataUrl: string | null) => void;
  /** Pre-fill the slot with an existing document (e.g. captured on the tablet). */
  value?: string | null;
}

export function DocumentUpload({ label, onChange, value }: Props) {
  const [preview, setPreview] = React.useState<string | null>(value ?? null);
  const [filename, setFilename] = React.useState<string>("");
  const [isPdf, setIsPdf] = React.useState(false);

  // Reflect a value supplied/changed by the parent (e.g. tablet capture).
  React.useEffect(() => {
    if (value) {
      setPreview(value);
      setIsPdf(/\.pdf($|\?)|application\/pdf/i.test(value));
    }
  }, [value]);

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setIsPdf(file.type === "application/pdf");
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPreview(url);
      onChange?.(url);
    };
    reader.readAsDataURL(file);
  };

  const clear = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setPreview(null);
    setFilename("");
    setIsPdf(false);
    onChange?.(null);
  };

  return (
    <div>
      <label className="block">
        <div className="relative aspect-[3/2] rounded-md border-2 border-dashed border-border bg-surface-sunken overflow-hidden cursor-pointer hover:bg-surface-sunken/60 transition-colors">
          {preview && !isPdf && (
            <Image src={preview} alt="ID preview" fill unoptimized className="object-contain bg-black/5" />
          )}
          {preview && isPdf && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-danger-soft/30 text-danger">
              <FileImage className="h-8 w-8" />
              <p className="text-xs mt-2 font-medium">{filename}</p>
              <p className="text-[10px]">PDF · click to replace</p>
            </div>
          )}
          {preview && (
            <>
              <span className="absolute top-1.5 right-1.5 bg-success text-white rounded-full h-6 w-6 flex items-center justify-center shadow-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <button
                type="button"
                onClick={clear}
                className="absolute bottom-1.5 right-1.5 bg-surface/90 hover:bg-danger hover:text-white rounded-md h-7 px-2 text-xs inline-flex items-center gap-1 border border-border shadow-sm"
              >
                <X className="h-3 w-3" />Remove
              </button>
            </>
          )}
          {!preview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-subtle-foreground">
              <FileImage className="h-6 w-6" />
              <p className="text-xs mt-2 font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Click to upload · PNG, JPG, PDF</p>
            </div>
          )}
        </div>
        <input type="file" accept="image/*,application/pdf" onChange={upload} className="sr-only" />
      </label>
    </div>
  );
}
