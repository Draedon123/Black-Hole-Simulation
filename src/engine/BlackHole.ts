import { BufferWriter } from "../utils/BufferWriter";
import { Vector3 } from "../utils/Vector3";

type BlackHoleSettings = {
  position: Vector3;
  mass: number;
  radius: number;
};

const G: number = 6.6743e-11;
const c: number = 299792458;

class BlackHole implements BlackHoleSettings {
  private static readonly BYTE_LENGTH: number =
    5 * Float32Array.BYTES_PER_ELEMENT +
    // padding
    3 * Float32Array.BYTES_PER_ELEMENT;

  public buffer!: GPUBuffer;

  private initialised: boolean;
  private device!: GPUDevice;
  public position: Vector3;
  public mass: number;
  public radius: number;
  constructor(settings: Partial<BlackHoleSettings> = {}) {
    this.initialised = false;
    this.position = settings.position ?? new Vector3();
    this.mass = settings.mass ?? 1e31;
    this.radius = settings.radius ?? 1e7;
  }

  public initialise(device: GPUDevice): void {
    if (this.initialised) {
      return;
    }

    this.device = device;
    this.buffer = this.device.createBuffer({
      label: "Black Hole Buffer",
      size: BlackHole.BYTE_LENGTH,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.initialised = true;

    this.updateBuffer();
  }

  public updateBuffer(): void {
    if (!this.initialised) {
      console.error("Black Hole not initialised");
    }

    this.device.queue.writeBuffer(this.buffer, 0, this.serialise());
  }

  private serialise(): ArrayBuffer {
    const bufferWriter = new BufferWriter(BlackHole.BYTE_LENGTH);

    bufferWriter.writeVec3f(this.position);
    bufferWriter.writeFloat32(this.mass);
    bufferWriter.writeFloat32(this.schwarzschildRadius);

    return bufferWriter.buffer;
  }

  public get schwarzschildRadius(): number {
    return (2 * G * this.mass) / (c * c);
  }
}

export { BlackHole };
export type { BlackHoleSettings };
