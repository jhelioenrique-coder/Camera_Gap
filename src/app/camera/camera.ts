import { Component, AfterViewInit, OnDestroy, EventEmitter, Output } from '@angular/core';

interface Localizacao {
  lat: number | null;
  lng: number | null;
  end: string;
}

interface FotoData {
  base64: string;
  data: string;
  local: string;
  lat: number | null;
  lng: number | null;
}

@Component({
  selector: 'app-camera-denuncia',
  standalone: true,
  imports: [],
  templateUrl: './camera.html',
  styleUrl: './camera.css',
})
export class CameraDenuncia implements AfterViewInit, OnDestroy {

  @Output() fotoConfirmada = new EventEmitter<string>();
  @Output() fotoLimpa = new EventEmitter<void>();
  @Output() enderecoDetectado = new EventEmitter<string>();

  private stream: MediaStream | null = null;
  private foto: FotoData | null = null;

  ngAfterViewInit(): void {
    this.autoPreencherEndereco();

  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private getEl<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  async abrirCamera(): Promise<void> {
    const modal = this.getEl<HTMLElement>('cameraModal');
    if (!modal) return;

    modal.classList.add('active');
    await this.startCamera();
  }

  fecharCamera(): void {
    this.closeModal();
  }

  async tirarFoto(): Promise<void> {
    const f = await this.capturar();
    if (!f) return;

    this.foto = f;

    const video = this.getEl<HTMLVideoElement>('video');
    const preview = this.getEl<HTMLImageElement>('fotoPreview');
    const previewArea = this.getEl<HTMLElement>('fotoPreviewArea');
    const controls = this.getEl<HTMLElement>('camera-controls');
    const confirmArea = this.getEl<HTMLElement>('confirmArea');

    if (video) video.style.display = 'none';
    if (preview) preview.src = f.base64;
    if (previewArea) previewArea.style.display = 'block';
    if (controls) controls.style.display = 'none';
    if (confirmArea) confirmArea.style.display = 'flex';
  }

  tirarOutraFoto(): void {
    this.foto = null;
    this.fotoLimpa.emit();

    const video = this.getEl<HTMLVideoElement>('video');
    const controls = this.getEl<HTMLElement>('camera-controls');
    const confirmArea = this.getEl<HTMLElement>('confirmArea');
    const statusEl = this.getEl<HTMLElement>('statusInfo');

    if (video) video.style.display = 'block';
    if (controls) controls.style.display = 'flex';
    if (confirmArea) confirmArea.style.display = 'none';
    if (statusEl) statusEl.innerHTML = 'Câmera pronta!';
  }

  confirmarFoto(): void {
    if (!this.foto) return;

    const previewExterno = this.getEl<HTMLImageElement>('previewExterno');
    const previewExternoArea = this.getEl<HTMLElement>('previewExternoArea');
    const statusEl = this.getEl<HTMLElement>('statusInfo');

    if (previewExterno) previewExterno.src = this.foto.base64;
    if (previewExternoArea) previewExternoArea.style.display = 'block';

    this.fotoConfirmada.emit(this.foto.base64);

    this.closeModal();

    if (statusEl) statusEl.innerHTML = 'Foto salva!';
  }

  private async getLocal(): Promise<Localizacao> {
    return new Promise((resolve) => {

      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null, end: 'GPS não suportado' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          let end = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );

            const data = await res.json();

            if (data.display_name) {
              end = data.display_name.substring(0, 100);
            }

          } catch { }

          resolve({ lat, lng, end });
        },
        () => resolve({ lat: null, lng: null, end: 'Não disponível' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  private async capturar(): Promise<FotoData | null> {

    const video = this.getEl<HTMLVideoElement>('video');
    const canvas = this.getEl<HTMLCanvasElement>('canvas');

    if (!video || !canvas || !video.videoWidth) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataHora = new Date().toLocaleString('pt-BR');
    const y = canvas.height - 40;

    ctx.fillStyle = 'rgb(9, 9, 9)';
    ctx.fillRect(10, y - 20, 250, 30);

    //    CARIMBA O ENDERECO e DATA/HORA NA FOTO //
    const local = await this.getLocal();
    ctx.fillRect(10, y - 20, canvas.width - 20, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(dataHora, 20, y);
    ctx.font = '12px monospace';
    ctx.fillText(local.end.length > 60 ? local.end.substring(0, 60) + '...' : local.end, 20, y + 20);

    return {
      base64: canvas.toDataURL('image/jpeg', 0.9),
      data: dataHora,
      local: local.end,
      lat: local.lat,
      lng: local.lng
    };
  }

  private async startCamera(): Promise<void> {

    const video = this.getEl<HTMLVideoElement>('video');
    const statusEl = this.getEl<HTMLElement>('statusInfo');
    const controls = this.getEl<HTMLElement>('camera-controls');
    const confirmArea = this.getEl<HTMLElement>('confirmArea');

    if (!video) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      video.srcObject = this.stream;
      await video.play();

      if (statusEl) statusEl.innerHTML = 'Câmera pronta!';
      if (controls) controls.style.display = 'flex';
      if (confirmArea) confirmArea.style.display = 'none';

    } catch {
      if (statusEl) statusEl.innerHTML = 'Erro ao acessar câmera';
    }
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
  }

  private closeModal(): void {
    const modal = this.getEl<HTMLElement>('cameraModal');

    this.stopCamera();

    if (modal) modal.classList.remove('active');
  }

  private async autoPreencherEndereco(): Promise<void> {
    const local = await this.getLocal();
    this.enderecoDetectado.emit(local.end);
  }
}