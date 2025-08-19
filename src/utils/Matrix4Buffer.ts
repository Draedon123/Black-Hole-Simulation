import { bufferData } from "./bufferData";
import { Matrix4 } from "./Matrix4";

class Matrix4Buffer extends Matrix4 {
  public readonly buffer: GPUBuffer;
  private readonly device: GPUDevice;
  public readonly label: string;

  constructor(
    device: GPUDevice,
    label: string,
    usage: number = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  ) {
    super();

    this.label = label;
    this.device = device;
    this.buffer = bufferData(device, this.label, usage, this.components.buffer);
  }

  public writeBuffer(): void {
    this.device.queue.writeBuffer(this.buffer, 0, this.components.buffer);
  }
}

export { Matrix4Buffer };
