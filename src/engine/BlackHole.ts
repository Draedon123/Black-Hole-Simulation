import { BufferWriter } from "../utils/BufferWriter";
import { roundUp16Bytes as roundUp16Bytes } from "../utils/roundUp16Bytes";
import { Vector3 } from "../utils/Vector3";

type BlackHoleSettings = {
  position: Vector3;
  mass: number;
  radius: number;
  spinParameter: number;
};

const G: number = 6.6743e-11;
const c: number = 299792458;

class BlackHole implements BlackHoleSettings {
  private static readonly BYTE_LENGTH: number = roundUp16Bytes(
    6 * Float32Array.BYTES_PER_ELEMENT
  );

  public buffer!: GPUBuffer;

  private initialised: boolean;
  private device!: GPUDevice;
  public position: Vector3;
  public mass: number;
  public radius: number;
  public spinParameter: number;
  constructor(settings: Partial<BlackHoleSettings> = {}) {
    this.initialised = false;
    this.position = settings.position ?? new Vector3();
    this.mass = settings.mass ?? 1e31;
    this.radius = settings.radius ?? 1e7;
    this.spinParameter = settings.spinParameter ?? 0.99;
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
    bufferWriter.writeFloat32(this.kerrParameter);

    return bufferWriter.buffer;
  }

  public get schwarzschildRadius(): number {
    // r_s = 2GM / c^2
    return (2 * G * this.mass) / (c * c);
  }

  public get kerrParameter(): number {
    // spin parameter = s = cJ / GM^2
    // => J = sGM^2 / c
    // a = J / Mc
    // => a = sGM^2 / Mc^2
    // => a = sGM / c^2
    return (this.spinParameter * G * this.mass) / (c * c);
  }
}

export { BlackHole };
export type { BlackHoleSettings };
