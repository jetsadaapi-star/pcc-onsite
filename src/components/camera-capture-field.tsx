"use client";

import { Camera, ScanText, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type CapturedPhoto = {
  id: string;
  file: File;
  url: string;
};

type CameraCaptureFieldProps = {
  name: string;
  label: string;
  title: string;
  description: string;
  multiple?: boolean;
  tone?: "default" | "danger" | "receipt";
  ocrTargets?: Array<{ targetId: string; label: string }>;
};

export function CameraCaptureField({
  name,
  label,
  title,
  description,
  multiple = false,
  tone = "default",
  ocrTargets = []
}: CameraCaptureFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photosRef = useRef<CapturedPhoto[]>([]);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrNumbers, setOcrNumbers] = useState<string[]>([]);
  const [ocrTargetId, setOcrTargetId] = useState(ocrTargets[0]?.targetId ?? "");

  const syncFiles = useCallback((items: CapturedPhoto[]) => {
    photosRef.current = items;
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    items.forEach((item) => transfer.items.add(item.file));
    inputRef.current.files = transfer.files;
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องในหน้าเว็บ");
      inputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 }
        }
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError("เปิดกล้องไม่ได้ กรุณาอนุญาตการใช้กล้อง หรือลองเลือกรูปจากเครื่อง");
    }
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) return;

    const file = new File([blob], `${name}-${Date.now()}.jpg`, { type: "image/jpeg" });
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file)
    };

    setPhotos((current) => {
      const next = multiple ? [...current, item] : [item];
      if (!multiple) current.forEach((photo) => URL.revokeObjectURL(photo.url));
      syncFiles(next);
      return next;
    });

    if (!multiple) stopCamera();
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removing = current.find((photo) => photo.id === id);
      if (removing) URL.revokeObjectURL(removing.url);
      const next = current.filter((photo) => photo.id !== id);
      syncFiles(next);
      return next;
    });
  }

  function pickFallbackFiles(files: FileList | null) {
    if (!files?.length) return;
    const nextPhotos = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file)
      }));

    setPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.url));
      const next = multiple ? nextPhotos : nextPhotos.slice(0, 1);
      syncFiles(next);
      return next;
    });
  }

  async function runOcr() {
    const photo = photosRef.current.at(-1);
    if (!photo) return;
    setOcrLoading(true);
    setOcrError(null);
    setOcrNumbers([]);

    try {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(photo.file, "eng");
      const numbers = Array.from(new Set((result.data.text.match(/\d+(?:[.,]\d+)?/g) ?? [])
        .map((value) => value.replace(",", "."))
        .filter((value) => Number.isFinite(Number(value)))))
        .sort((a, b) => Number(b) - Number(a))
        .slice(0, 8);

      if (!numbers.length) {
        setOcrError("OCR ไม่พบตัวเลขในรูป ลองถ่ายให้ชัดและใกล้ขึ้น");
      } else {
        setOcrNumbers(numbers);
      }
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : "OCR อ่านรูปไม่สำเร็จ");
    } finally {
      setOcrLoading(false);
    }
  }

  function fillOcrNumber(value: string) {
    const target = document.getElementById(ocrTargetId) as HTMLInputElement | null;
    if (!target) return;
    target.value = value;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="camera-field">
      <span className="field-label"><Camera size={15} /> {label}</span>
      <input
        ref={inputRef}
        className="camera-capture-input"
        name={name}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        onChange={(event) => pickFallbackFiles(event.target.files)}
      />

      {!cameraOpen ? (
        <button className={`camera-capture-button ${tone === "default" ? "" : tone}`} type="button" onClick={openCamera}>
          <span><Camera size={19} /></span>
          <strong>{title}</strong>
          <small>{description}</small>
        </button>
      ) : (
        <div className={`inline-camera ${tone === "default" ? "" : tone}`}>
          <video ref={videoRef} muted playsInline />
          <div className="inline-camera-actions">
            <button className="camera-round-action ghost" type="button" onClick={stopCamera} aria-label="ปิดกล้อง">
              <X size={18} />
            </button>
            <button className="camera-shutter" type="button" onClick={capturePhoto} aria-label="ถ่ายรูป">
              <Camera size={22} />
            </button>
            <button className="camera-round-action ghost" type="button" onClick={openCamera} aria-label="เปิดกล้องใหม่">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      )}

      {cameraError ? (
        <div className="camera-error-row">
          <span>{cameraError}</span>
          <button type="button" onClick={() => inputRef.current?.click()}>เลือกรูป</button>
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div className="captured-photo-grid">
          {photos.map((photo, index) => (
            <div className="captured-photo" key={photo.id}>
              <img src={photo.url} alt={`${label} ${index + 1}`} />
              <button type="button" onClick={() => removePhoto(photo.id)} aria-label="ลบรูป">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {photos.length > 0 && ocrTargets.length > 0 ? (
        <div className="ocr-assist-panel">
          <div className="ocr-assist-head">
            <button className="button secondary" type="button" onClick={runOcr} disabled={ocrLoading}>
              <ScanText size={16} />
              {ocrLoading ? "กำลังอ่านตัวเลข..." : "OCR อ่านตัวเลข"}
            </button>
            <select value={ocrTargetId} onChange={(event) => setOcrTargetId(event.target.value)} aria-label="OCR target">
              {ocrTargets.map((target) => (
                <option key={target.targetId} value={target.targetId}>{target.label}</option>
              ))}
            </select>
          </div>
          {ocrError ? <div className="camera-error-row"><span>{ocrError}</span></div> : null}
          {ocrNumbers.length > 0 ? (
            <div className="ocr-number-list">
              {ocrNumbers.map((number) => (
                <button type="button" key={number} onClick={() => fillOcrNumber(number)}>
                  {number}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
