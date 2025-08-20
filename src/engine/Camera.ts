import { BufferWriter } from "../utils/BufferWriter";
import { Vector3 } from "../utils/Vector3";

type CameraSettings = {
  imageWidth: number;
  imageHeight: number;
  fieldOfView: number;
  position: Vector3;
  lookAt: Vector3;
};

class Camera {
  public static readonly BYTE_LENGTH: number =
    18 * Float32Array.BYTES_PER_ELEMENT +
    // padding
    2 * Float32Array.BYTES_PER_ELEMENT;
  private static readonly GLOBAL_UP: Vector3 = new Vector3(0, 1, 0);

  public imageWidth: number;
  public imageHeight: number;
  public fieldOfView: number;
  public position: Vector3;
  public lookAt: Vector3;

  private up!: Vector3;
  private right!: Vector3;
  private back!: Vector3;
  private viewportDeltaU!: Vector3;
  private viewportDeltaV!: Vector3;
  private pixel00!: Vector3;

  private initialised: boolean;
  private device!: GPUDevice;
  public buffer!: GPUBuffer;

  constructor(settings: Partial<CameraSettings> = {}) {
    this.imageWidth = settings.imageWidth ?? 1920;
    this.imageHeight = settings.imageHeight ?? 1080;
    this.fieldOfView = settings.fieldOfView ?? Math.PI / 3;
    this.position = settings.position ?? new Vector3();
    this.lookAt = settings.lookAt ?? new Vector3(0, 0, -1);

    this.initialised = false;
  }

  private serialise(): ArrayBuffer {
    const bufferWriter = new BufferWriter(Camera.BYTE_LENGTH);

    bufferWriter.writeVec3f(this.position);
    bufferWriter.pad(4);
    bufferWriter.writeVec3f(this.viewportDeltaU);
    bufferWriter.pad(4);
    bufferWriter.writeVec3f(this.viewportDeltaV);
    bufferWriter.pad(4);
    bufferWriter.writeVec3f(this.pixel00);
    bufferWriter.pad(4);
    bufferWriter.writeFloat32(this.imageWidth);
    bufferWriter.writeFloat32(this.imageHeight);

    return bufferWriter.buffer;
  }

  public initialise(device: GPUDevice): void {
    if (this.initialised) {
      return;
    }

    this.device = device;
    this.buffer = device.createBuffer({
      label: "Camera Buffer",
      size: Camera.BYTE_LENGTH,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.initialised = true;

    this.updateBuffer();
  }

  public updateBuffer(): void {
    if (!this.initialised) {
      return;
    }

    const aspectRatio = this.imageWidth / this.imageHeight;

    const focalLength = Vector3.subtract(this.position, this.lookAt).magnitude;

    if (focalLength < 1e-8) {
      console.error(`Look At is too close to Position. Buffer not updated`);
      return;
    }

    const viewportHeight = 2 * focalLength * Math.tan(this.fieldOfView / 2);
    const viewportWidth = aspectRatio * viewportHeight;

    this.back = Vector3.subtract(this.position, this.lookAt).normalise();
    this.right = Vector3.cross(Camera.GLOBAL_UP, this.back);
    this.up = Vector3.cross(this.back, this.right);

    const viewportU = Vector3.scale(this.right, viewportWidth);
    const viewportV = Vector3.scale(this.up, viewportHeight);

    this.viewportDeltaU = Vector3.scale(viewportU, 1 / this.imageWidth);
    this.viewportDeltaV = Vector3.scale(viewportV, 1 / this.imageHeight);

    const position = this.position
      .clone()
      .subtract(Vector3.scale(this.back, focalLength));

    this.pixel00 = position
      .subtract(Vector3.add(viewportU, viewportV).scale(0.5))
      .add(Vector3.add(this.viewportDeltaU, this.viewportDeltaV).scale(0.5));

    this.device.queue.writeBuffer(this.buffer, 0, this.serialise());
  }

  public setImageDimensions(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;

    this.updateBuffer();
  }

  public get aspectRatio(): number {
    return this.imageWidth / this.imageHeight;
  }
}

export { Camera };
