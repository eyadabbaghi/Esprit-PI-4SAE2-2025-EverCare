import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CameraService {
  private stream: MediaStream | null = null;

  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    // Stop any existing stream first
    this.stopCamera();

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    videoElement.srcObject = this.stream;
    videoElement.muted = true;
    videoElement.playsInline = true;

    // Wait for video to be ready before playing
    await new Promise<void>((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play()
          .then(() => resolve())
          .catch(reject);
      };
      // Timeout fallback
      setTimeout(() => resolve(), 2000);
    });
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  captureFrame(videoElement: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');

  // Use actual video dimensions, minimum 640x480
  canvas.width = Math.max(videoElement.videoWidth, 640);
  canvas.height = Math.max(videoElement.videoHeight, 480);

  const ctx = canvas.getContext('2d')!;

  // Mirror correction — undo the CSS mirror so face is correct orientation
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Higher quality JPEG
  return canvas.toDataURL('image/jpeg', 0.95);
}
}