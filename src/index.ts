import "./style.css";
import { Renderer } from "./engine/Renderer";
import { Loop } from "./utils/Loop";

async function main(): Promise<void> {
  const canvas = document.getElementById("main") as HTMLCanvasElement;
  const renderer = await Renderer.create(canvas, {
    gamma: 1,
  });
  await renderer.initialise();

  const loop = new Loop();

  loop.addCallback((data) => {
    const scale = data.totalTime / 5000;
    renderer.render();
    renderer.camera.lookAt.x = Math.sin(scale);
    renderer.camera.lookAt.z = Math.cos(scale);
    renderer.camera.updateBuffer();
    // @ts-expect-error just temporary
    renderer.skyboxRenderer.render(renderer.camera);
  });

  loop.start();
}

main().catch((error) => {
  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);
  const errorElement = document.getElementById("error");

  if (errorElement !== null) {
    errorElement.textContent = errorMessage;
  }

  console.error(errorMessage);
});
