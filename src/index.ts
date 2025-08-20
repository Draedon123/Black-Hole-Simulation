import "./style.css";
import { Renderer } from "./engine/Renderer";
import { Loop } from "./utils/Loop";

async function main(): Promise<void> {
  const canvas = document.getElementById("main") as HTMLCanvasElement;
  const renderer = await Renderer.create(canvas, {
    gamma: 1,
    numberOfSteps: 100,
  });
  await renderer.initialise();

  renderer.camera.position.x =
    renderer.blackHole.schwarzschildRadius * Math.SQRT1_2 * 5;
  renderer.camera.position.z =
    renderer.blackHole.schwarzschildRadius * Math.SQRT1_2 * 5;

  const loop = new Loop();

  // const scale = 5e-4;
  loop.addCallback((/*data*/) => {
    // renderer.camera.lookAt.x =
    //   renderer.camera.position.x +
    //   Math.max(1, renderer.camera.position.x) *
    //     Math.cos(data.totalTime * scale);
    // renderer.camera.lookAt.z =
    //   renderer.camera.position.z +
    //   Math.max(1, renderer.camera.position.z) *
    //     Math.sin(-data.totalTime * scale);
    // renderer.camera.updateBuffer();
    renderer.render();
  });

  loop.start();
}

main().catch((error) => {
  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);
  const errorElement = document.getElementById("info");

  if (errorElement !== null) {
    errorElement.classList.add("error");
    errorElement.textContent = errorMessage;
  }

  console.error(errorMessage);
});
