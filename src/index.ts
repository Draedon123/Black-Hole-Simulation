import "./style.css";
import { Renderer } from "./engine/Renderer";
import { Loop } from "./utils/Loop";
import { initialiseConfigPanel } from "./configPanel";

async function main(): Promise<void> {
  const canvas = document.getElementById("main") as HTMLCanvasElement;
  const frameTimeElement = document.getElementById("frameTime") as HTMLElement;
  const fpsElement = document.getElementById("fps") as HTMLElement;
  const renderer = await Renderer.create(canvas, {
    gamma: 1,
    numberOfSteps: 100,
    timing: {
      frameTimeElement,
      fpsElement,
    },
  });
  await renderer.initialise();

  initialiseConfigPanel(renderer);

  renderer.camera.position.x =
    renderer.blackHole.schwarzschildRadius * Math.SQRT1_2 * 5;
  renderer.camera.position.z =
    renderer.blackHole.schwarzschildRadius * Math.SQRT1_2 * 5;

  const loop = new Loop();

  const scale = 5e-4;

  const updateCamera = (time: number) => {
    renderer.camera.lookAt.x =
      renderer.camera.position.x +
      Math.max(1, renderer.camera.position.x) * Math.cos(time * scale);
    renderer.camera.lookAt.z =
      renderer.camera.position.z +
      Math.max(1, renderer.camera.position.z) * Math.sin(-time * scale);
    renderer.camera.updateBuffer();
  };

  loop.addCallback((data) => {
    updateCamera(data.totalTime);
    renderer.render();
  });

  updateCamera(0);
  loop.start();
}

main().catch((error) => {
  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);
  const errorElement = document.getElementById("alert");

  if (errorElement !== null) {
    errorElement.classList.add("error");
    errorElement.textContent = errorMessage;
  }

  console.error(errorMessage);
});
