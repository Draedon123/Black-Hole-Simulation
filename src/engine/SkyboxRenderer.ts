import { Shader } from "./Shader";
import { Camera } from "./Camera";
import { Texture } from "./Texture";
import { Matrix4Buffer } from "../utils/Matrix4Buffer";
import { resolveBasePath } from "../utils/resolveBasePath";

class SkyboxRenderer {
  private readonly device: GPUDevice;
  private readonly inversePespectiveViewMatrix: Matrix4Buffer;

  private readonly bindGroups: GPUBindGroup[] = [];
  public readonly label: string;
  public readonly skyboxes: Texture[];

  public sampler: GPUSampler;
  public framebuffer: GPUTexture;

  private dimensions: [number, number];
  private activeSkybox: number;
  private renderBindGroupLayout!: GPUBindGroupLayout;
  private renderPipeline!: GPURenderPipeline;

  constructor(
    device: GPUDevice,
    shader: Shader,
    canvasFormat: GPUTextureFormat,
    dimensions: [number, number],
    label: string
  ) {
    this.activeSkybox = -1;
    this.skyboxes = [];
    this.bindGroups = [];
    this.dimensions = dimensions;
    this.device = device;
    this.label = label;
    this.inversePespectiveViewMatrix = new Matrix4Buffer(
      device,
      `${this.label} Inverse Perspective View Matrix Buffer`
    );

    this.framebuffer = this.createFramebuffer();
    this.sampler = this.device.createSampler({
      label: `${this.label} Sampler`,
    });

    this.renderBindGroupLayout = this.device.createBindGroupLayout({
      label: `${this.label} Bind Group Layout`,
      entries: [
        {
          binding: 0,
          sampler: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 1,
          texture: {
            viewDimension: "cube",
          },
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 2,
          buffer: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
      ],
    });

    const renderPipelineLayout = this.device.createPipelineLayout({
      label: `${this.label} Render Pipeline Layout`,
      bindGroupLayouts: [this.renderBindGroupLayout],
    });
    this.renderPipeline = this.device.createRenderPipeline({
      label: `${this.label} Render Pipeline`,
      layout: renderPipelineLayout,
      vertex: {
        module: shader.shader,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: shader.shader,
        entryPoint: "fragmentMain",
        targets: [{ format: canvasFormat }],
      },
    });

    for (let i = 0, skyboxes = this.skyboxes.length; i < skyboxes; i++) {
      const skybox = this.skyboxes[i];

      this.skyboxes.splice(0, 1);
      this.addSkybox(skybox);
    }
  }

  public static async create(
    device: GPUDevice,
    canvasFormat: GPUTextureFormat,
    dimensions: [number, number],
    label: string
  ): Promise<SkyboxRenderer> {
    const shader = await Shader.fetch(
      device,
      resolveBasePath("shaders/skybox.wgsl"),
      `${label} Shader Module`
    );

    return new SkyboxRenderer(device, shader, canvasFormat, dimensions, label);
  }

  private createFramebuffer(): GPUTexture {
    return this.device.createTexture({
      label: `${this.label} Framebuffer`,
      format: "rgba8unorm",
      size: this.dimensions,
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_DST,
    });
  }

  public addSkybox(skybox: Texture): void {
    const renderBindGroup = this.device.createBindGroup({
      label: `${this.label} ${skybox.label} Bind Group`,
      layout: this.renderBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: this.sampler,
        },
        {
          binding: 1,
          resource: skybox.texture.createView({
            dimension: "cube",
          }),
        },
        {
          binding: 2,
          resource: {
            buffer: this.inversePespectiveViewMatrix.buffer,
          },
        },
      ],
    });

    this.skyboxes.push(skybox);
    this.bindGroups.push(renderBindGroup);
  }

  public setActiveSkybox(skybox: Texture | null): void {
    if (skybox === null) {
      this.activeSkybox = -1;
      return;
    }

    if (!this.skyboxes.includes(skybox)) {
      this.addSkybox(skybox);
    }

    const skyboxIndex = this.skyboxes.findIndex((box) => box === skybox);
    this.activeSkybox = skyboxIndex;
  }

  public render(camera: Camera): void {
    if (this.activeSkybox === -1) {
      console.warn("No active skybox");

      return;
    }

    this.inversePespectiveViewMatrix.copyFrom(
      camera.getPerspectiveViewMatrix().invert()
    );
    this.inversePespectiveViewMatrix.writeBuffer();

    const commandEncoder = this.device.createCommandEncoder({
      label: "Skybox Command Encoder",
    });

    const renderPass = commandEncoder.beginRenderPass({
      label: "Skybox Render Pass",
      colorAttachments: [
        {
          loadOp: "clear",
          storeOp: "store",
          view: this.framebuffer.createView(),
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.bindGroups[this.activeSkybox]);
    renderPass.draw(3);

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  public setDimensions(dimensions: [number, number]): void {
    this.dimensions = dimensions;
    this.framebuffer?.destroy();
    this.framebuffer = this.createFramebuffer();
  }
}

export { SkyboxRenderer };
