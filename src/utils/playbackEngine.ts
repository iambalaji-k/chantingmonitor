import type { ChantingPhase } from '../context/ChantingContext';

export interface QueueItem {
  type: ChantingPhase;
  src: string;
  bead: number;
}

export class PlaybackEngine {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private pausedOffset: number = 0;
  private startTime: number = 0;
  private dummyAudio: HTMLAudioElement | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  
  private queue: QueueItem[] = [];
  private currentIndex: number = 0;
  private currentSpeed: number = 5;
  
  public isPlaying: boolean = false;
  public isUserPaused: boolean = true;
  
  // Callbacks to notify React
  public onStateChange: (state: { phase: ChantingPhase; bead: number; roundIncrement: boolean }) => void = () => {};
  public onPlayPause: (isPlaying: boolean) => void = () => {};

  constructor() {
    // Initialise audio context on first creation if possible,
    // though it might be suspended until user interaction.
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Create a MediaStream destination
      this.mediaStreamDest = this.audioContext.createMediaStreamDestination();
      
      // Route the MediaStream to an HTMLAudioElement
      this.dummyAudio = new Audio();
      this.dummyAudio.crossOrigin = 'anonymous';
      this.dummyAudio.srcObject = this.mediaStreamDest.stream;
      this.dummyAudio.preload = 'auto';
    } catch (e) {
      console.warn('Web Audio API / MediaStream not supported:', e);
    }
  }

  // Preload and decode all audio assets
  public async preloadAll(): Promise<void> {
    this.ensureAudioContext();
    
    const urls = [
      '/assets/ptsound.mp3',
      '/assets/alert108.mp3',
      '/assets/spsound1.mp3',
      '/assets/spsound2.mp3',
      '/assets/spsound3.mp3',
      '/assets/spsound4.mp3',
      '/assets/spsound5.mp3',
    ];

    await Promise.all(urls.map(async url => {
      try {
        if (!this.buffers.has(url)) {
          const buffer = await this.loadBuffer(url);
          this.buffers.set(url, buffer);
          console.log(`Successfully preloaded Web Audio buffer for ${url}`);
        }
      } catch (err) {
        console.error(`Failed to preload Web Audio buffer for ${url}:`, err);
      }
    }));
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => console.warn('Failed to resume AudioContext:', err));
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    
    return new Promise((resolve, reject) => {
      this.audioContext!.decodeAudioData(
        arrayBuffer,
        decodedBuffer => resolve(decodedBuffer),
        err => reject(err)
      );
    });
  }

  public generateQueue(phase: ChantingPhase, bead: number, speed: number): void {
    this.currentIndex = 0;
    this.currentSpeed = speed;
    this.queue = [];

    const pranamSrc = '/assets/ptsound.mp3';
    const chimeSrc = '/assets/alert108.mp3';
    const mantraSrc = `/assets/spsound${speed}.mp3`;

    if (phase === 'pranam1') {
      this.queue.push({ type: 'pranam1', src: pranamSrc, bead: 0 });
      for (let i = 1; i <= 108; i++) {
        this.queue.push({ type: 'mantra', src: mantraSrc, bead: i });
      }
      this.queue.push({ type: 'pranam2', src: pranamSrc, bead: 108 });
      this.queue.push({ type: 'chime', src: chimeSrc, bead: 108 });
    } else if (phase === 'mantra') {
      for (let i = bead; i <= 108; i++) {
        this.queue.push({ type: 'mantra', src: mantraSrc, bead: i });
      }
      this.queue.push({ type: 'pranam2', src: pranamSrc, bead: 108 });
      this.queue.push({ type: 'chime', src: chimeSrc, bead: 108 });
    } else if (phase === 'pranam2') {
      this.queue.push({ type: 'pranam2', src: pranamSrc, bead: 108 });
      this.queue.push({ type: 'chime', src: chimeSrc, bead: 108 });
    } else if (phase === 'chime') {
      this.queue.push({ type: 'chime', src: chimeSrc, bead: 108 });
    }
  }

  public start(phase: ChantingPhase, bead: number, speed: number): void {
    this.isUserPaused = false;
    this.generateQueue(phase, bead, speed);
    this.playCurrent();
  }

  private stopCurrentNode(): void {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.onended = null;
        this.currentSourceNode.stop();
      } catch (e) {
        // Buffer source node was already stopped or not started
      }
      this.currentSourceNode = null;
    }
  }

  private playBuffer(buffer: AudioBuffer, type: ChantingPhase, bead: number, offset: number = 0): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    this.stopCurrentNode();

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    if (this.mediaStreamDest) {
      source.connect(this.mediaStreamDest);
    } else {
      source.connect(this.audioContext.destination);
    }

    this.currentSourceNode = source;
    this.pausedOffset = offset;
    this.startTime = this.audioContext.currentTime - offset;

    source.onended = () => {
      if (this.currentSourceNode === source && this.isPlaying) {
        this.advanceQueue();
      }
    };

    source.start(0, offset);
    this.isPlaying = true;
    this.isUserPaused = false;
    
    if (this.dummyAudio && this.dummyAudio.paused) {
      this.dummyAudio.play().catch(err => console.warn('Failed to play dummy audio:', err));
    }

    this.updateMediaSessionState();
    this.onPlayPause(true);
    this.onStateChange({ phase: type, bead: bead, roundIncrement: false });
  }

  public playCurrent(): void {
    if (this.queue.length === 0) return;
    const item = this.queue[this.currentIndex];
    const url = item.src;
    
    const buffer = this.buffers.get(url);

    if (buffer) {
      this.playBuffer(buffer, item.type, item.bead, 0);
    } else {
      this.loadBuffer(url).then(decodedBuffer => {
        this.buffers.set(url, decodedBuffer);
        this.playBuffer(decodedBuffer, item.type, item.bead, 0);
      }).catch(err => {
        console.error('Failed to load buffer in playCurrent:', url, err);
      });
    }
  }

  private advanceQueue(): void {
    let roundIncrement = false;
    this.currentIndex++;

    if (this.currentIndex >= this.queue.length) {
      roundIncrement = true;
      this.generateQueue('pranam1', 0, this.currentSpeed);
    }

    const item = this.queue[this.currentIndex];
    const url = item.src;

    const buffer = this.buffers.get(url);

    console.log({
      visibility: document.visibilityState,
      nextAudioKey: url,
      playing: this.isPlaying
    });

    if (buffer) {
      this.playBuffer(buffer, item.type, item.bead, 0);
      // Fire round state update if completed
      if (roundIncrement) {
        this.onStateChange({ phase: item.type, bead: item.bead, roundIncrement: true });
      }
    } else {
      this.loadBuffer(url).then(decodedBuffer => {
        this.buffers.set(url, decodedBuffer);
        this.playBuffer(decodedBuffer, item.type, item.bead, 0);
        if (roundIncrement) {
          this.onStateChange({ phase: item.type, bead: item.bead, roundIncrement: true });
        }
      }).catch(err => {
        console.error(
          'Queue advance play failed',
          {
            message: err?.message,
            visibility: document.visibilityState,
            src: url
          }
        );
        this.isPlaying = false;
        this.onPlayPause(false);
        this.updateMediaSessionState();
      });
    }
  }

  public pause(): void {
    this.isUserPaused = true;
    this.isPlaying = false;
    
    if (this.currentSourceNode && this.audioContext) {
      const elapsed = this.audioContext.currentTime - this.startTime;
      this.pausedOffset = elapsed;
      this.stopCurrentNode();
    }

    if (this.dummyAudio) {
      this.dummyAudio.pause();
    }
    
    this.onPlayPause(false);
    this.updateMediaSessionState();
  }

  public resume(): void {
    if (this.queue.length === 0) return;
    this.isUserPaused = false;
    this.ensureAudioContext();

    const item = this.queue[this.currentIndex];
    const url = item.src;
    const buffer = this.buffers.get(url);

    if (this.dummyAudio && this.dummyAudio.paused) {
      this.dummyAudio.play().catch(err => console.warn('Failed to play dummy audio on resume:', err));
    }

    if (buffer) {
      // If pausedOffset is beyond duration, reset it
      if (this.pausedOffset >= buffer.duration) {
        this.pausedOffset = 0;
      }
      this.playBuffer(buffer, item.type, item.bead, this.pausedOffset);
    } else {
      this.playCurrent();
    }
  }

  public changeSpeed(speed: number): void {
    this.currentSpeed = speed;
    const mantraSrc = `/assets/spsound${speed}.mp3`;
    this.queue = this.queue.map((item, idx) => {
      if (idx > this.currentIndex && item.type === 'mantra') {
        return { ...item, src: mantraSrc };
      }
      return item;
    });
  }

  public setBeadManually(bead: number): void {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.isUserPaused = !wasPlaying;

    let phase: ChantingPhase = 'mantra';
    if (bead <= 0) {
      phase = 'pranam1';
    } else if (bead > 108) {
      phase = 'pranam2';
    }

    this.generateQueue(phase, bead, this.currentSpeed);
    
    if (wasPlaying) {
      this.playCurrent();
    } else {
      const item = this.queue[0];
      this.pausedOffset = 0;
      this.onStateChange({ phase: item.type, bead: item.bead, roundIncrement: false });
    }
  }

  public updateMediaSessionState(): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  public getAudioElement(): any {
    const self = this;
    return {
      get paused() {
        return self.audioContext ? self.audioContext.state === 'suspended' : true;
      },
      set currentTime(val: number) {
        if (val === 0) {
          self.pausedOffset = 0;
        }
      }
    };
  }

  public destroy(): void {
    this.stopCurrentNode();
    if (this.dummyAudio) {
      this.dummyAudio.pause();
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }
}
