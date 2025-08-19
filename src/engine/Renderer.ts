import { BufferWriter } from "../utils/BufferWriter";
import { resolveBasePath } from "../utils/resolveBasePath";
import { Camera } from "./Camera";
import { Shader } from "./Shader";
import { SkyboxRenderer } from "./SkyboxRenderer";
import { Texture } from "./Texture";

type RendererSettings = {
  gamma: number;
};

class Renderer {
  private static readonly RENDER_SETTINGS_BYTE_LENGTH: number =
    1 * Float32Array.BYTES_PER_ELEMENT;

  public readonly canvas: HTMLCanvasElement;
  public readonly camera: Camera;
  public readonly settings: RendererSettings;

  private readonly device: GPUDevice;
  private readonly ctx: GPUCanvasContext;
  private readonly canvasFormat: GPUTextureFormat;

  private initialised: boolean;
  private skyboxRenderer!: SkyboxRenderer;

  private renderSettingsBuffer!: GPUBuffer;
  private renderBindGroupLayout!: GPUBindGroupLayout;
  private renderBindGroup!: GPUBindGroup;
  private renderPipeline!: GPURenderPipeline;
  private renderTexture!: GPUTexture;
  private renderSampler!: GPUSampler;

  private computeSettingsBuffer!: GPUBuffer;
  private computeBindGroupLayout!: GPUBindGroupLayout;
  private computeBindGroup!: GPUBindGroup;
  private computePipeline!: GPUComputePipeline;

  private constructor(
    canvas: HTMLCanvasElement,
    settings: Partial<RendererSettings>,
    device: GPUDevice
  ) {
    const ctx = canvas.getContext("webgpu");

    if (ctx === null) {
      throw new Error("Could not create WebGPU Canvas Context");
    }

    this.canvas = canvas;
    this.device = device;
    this.ctx = ctx;
    this.canvasFormat = "rgba8unorm";
    this.camera = new Camera();
    this.initialised = false;

    this.settings = {
      gamma: settings.gamma ?? 1.5,
    };
  }

  private serialiseSettings(): ArrayBuffer {
    const bufferWriter = new BufferWriter(Renderer.RENDER_SETTINGS_BYTE_LENGTH);

    bufferWriter.writeFloat32(this.settings.gamma);

    return bufferWriter.buffer;
  }

  private createRenderTexture(): GPUTexture {
    return this.device.createTexture({
      label: "Render Texture",
      format: "rgba8unorm",
      size: [this.canvas.width, this.canvas.height],
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private createRenderBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      label: "Renderer Bind Group",
      layout: this.renderBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.renderSettingsBuffer },
        },
        {
          binding: 1,
          resource: this.renderTexture.createView(),
        },
        {
          binding: 2,
          resource: this.renderSampler,
        },
      ],
    });
  }

  private createComputeBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      label: "Compute Bind Group",
      layout: this.computeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.computeSettingsBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.camera.buffer },
        },
        {
          binding: 2,
          resource: this.renderTexture.createView(),
        },
        {
          binding: 3,
          resource: this.skyboxRenderer.framebuffer.createView(),
        },
      ],
    });
  }

  public async initialise(): Promise<void> {
    if (this.initialised) {
      return;
    }

    this.camera.initialise(this.device);

    await this.initialiseRendering();
    await this.initialiseCompute();

    new ResizeObserver((entries) => {
      const canvas = entries[0];

      const width = canvas.devicePixelContentBoxSize[0].inlineSize;
      const height = canvas.devicePixelContentBoxSize[0].blockSize;

      this.canvas.width = width;
      this.canvas.height = height;

      this.renderTexture.destroy();

      this.camera.setImageDimensions(width, height);
      this.skyboxRenderer.setDimensions([width, height]);
      this.renderTexture = this.createRenderTexture();
      this.renderBindGroup = this.createRenderBindGroup();
      this.computeBindGroup = this.createComputeBindGroup();

      this.skyboxRenderer.render(this.camera);
      this.render();
    }).observe(this.canvas);

    this.initialised = true;
  }

  private async initialiseRendering(): Promise<void> {
    this.ctx.configure({
      device: this.device,
      format: this.canvasFormat,
    });

    this.skyboxRenderer = await SkyboxRenderer.create(
      this.device,
      this.canvasFormat,
      [this.canvas.width, this.canvas.height],
      "Skybox"
    );

    const skybox = await Texture.createCubemap(
      this.device,
      "Skybox Texture",
      "skybox"
    );
    this.skyboxRenderer.addSkybox(skybox);
    this.skyboxRenderer.setActiveSkybox(skybox);

    this.renderSettingsBuffer = this.device.createBuffer({
      label: "Render Settings Buffer",
      size: Renderer.RENDER_SETTINGS_BYTE_LENGTH,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(
      this.renderSettingsBuffer,
      0,
      this.serialiseSettings()
    );

    this.renderTexture = this.createRenderTexture();
    this.renderSampler = this.device.createSampler({
      label: "Renderer Texture Sampler",
    });

    const shader = await Shader.fetch(
      this.device,
      resolveBasePath("shaders/render.wgsl")
    );

    this.renderBindGroupLayout = this.device.createBindGroupLayout({
      label: "Renderer Bind Group Layout",
      entries: [
        {
          binding: 0,
          buffer: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 1,
          texture: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 2,
          sampler: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
      ],
    });

    this.renderBindGroup = this.createRenderBindGroup();

    const pipelineLayout = this.device.createPipelineLayout({
      label: "Renderer Render Pipeline Layout",
      bindGroupLayouts: [this.renderBindGroupLayout],
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: "Renderer Render Pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shader.shader,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: shader.shader,
        entryPoint: "fragmentMain",
        targets: [{ format: this.canvasFormat }],
      },
    });
  }

  private async initialiseCompute(): Promise<void> {
    this.computeSettingsBuffer = this.device.createBuffer({
      label: "Compute Settings Buffer",
      size: 1 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    this.device.queue.writeBuffer(
      this.computeSettingsBuffer,
      0,
      new Float32Array([0])
    );

    const shader = await Shader.fetch(
      this.device,
      resolveBasePath("shaders/simulation.wgsl")
    );

    this.computeBindGroupLayout = this.device.createBindGroupLayout({
      label: "Compute Bind Group Layout",
      entries: [
        {
          binding: 0,
          buffer: {},
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 1,
          buffer: {},
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 2,
          storageTexture: {
            access: "write-only",
            format: "rgba8unorm",
          },
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 3,
          storageTexture: {
            format: "rgba8unorm",
            access: "read-only",
          },
          visibility: GPUShaderStage.COMPUTE,
        },
      ],
    });

    this.computeBindGroup = this.createComputeBindGroup();

    const pipelineLayout = this.device.createPipelineLayout({
      label: "Compute Pipeline Layout",
      bindGroupLayouts: [this.computeBindGroupLayout],
    });

    this.computePipeline = this.device.createComputePipeline({
      label: "Compute Pipeline",
      layout: pipelineLayout,
      compute: {
        module: shader.shader,
        entryPoint: "main",
      },
    });
  }

  public render(): void {
    this.compute();
    this.renderToCanvas();
  }

  private compute(): void {
    const commandEncoder = this.device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();

    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.setPipeline(this.computePipeline);
    computePass.dispatchWorkgroups(
      Math.ceil(this.canvas.width / 8),
      Math.ceil(this.canvas.height / 8),
      1
    );

    computePass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private renderToCanvas(): void {
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.setPipeline(this.renderPipeline);
    renderPass.draw(3);

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  public static async create(
    canvas: HTMLCanvasElement,
    settings: Partial<RendererSettings> = {}
  ): Promise<Renderer> {
    if (!("gpu" in navigator)) {
      throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();

    if (adapter === null) {
      throw new Error("Could not find suitable GPU Adapter");
    }

    const device = await adapter.requestDevice();

    if (device === null) {
      throw new Error("Could not find suitable GPU Device");
    }

    return new Renderer(canvas, settings, device);
  }
}

export { Renderer };
