type FrameData = {
  deltaTime: number;
  totalTime: number;
};
type LoopCallback = (frameData: FrameData) => unknown;

class Loop {
  private readonly callbacks: LoopCallback[] = [];
  private frameID: number | null;
  private lastFrameTime: number;
  private firstFrameTime: number;
  constructor() {
    this.frameID = null;
    this.lastFrameTime = 0;
    this.firstFrameTime = -1;
    this.callbacks = [];
  }

  public start(): void {
    if (this.running) {
      return;
    }

    this.firstFrameTime = -1;
    this.frameID = requestAnimationFrame(this.tick.bind(this));
  }

  public stop(): void {
    if (!this.running) {
      return;
    }

    cancelAnimationFrame(this.frameID as number);
    this.frameID = null;
  }

  public toggle(): void {
    if (this.running) {
      this.stop();
    } else {
      this.start();
    }
  }

  public addCallback(callback: LoopCallback): void {
    this.callbacks.push(callback);
  }

  private tick(tickTime: number): void {
    if (this.firstFrameTime < 0) {
      this.firstFrameTime = tickTime;
      this.lastFrameTime = tickTime;
    }

    const deltaTimeMS = tickTime - this.lastFrameTime;
    const totalTimeMS = tickTime - this.firstFrameTime;
    const frameData: FrameData = {
      deltaTime: deltaTimeMS,
      totalTime: totalTimeMS,
    };

    for (const callback of this.callbacks) {
      callback(frameData);
    }

    this.lastFrameTime = tickTime;
    this.frameID = requestAnimationFrame(this.tick.bind(this));
  }

  public get running(): boolean {
    return this.frameID !== null;
  }
}

export { Loop };
