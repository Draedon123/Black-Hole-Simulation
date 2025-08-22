import type { Renderer } from "./engine/Renderer";

function initialiseConfigPanel(renderer: Renderer): void {
  initialiseChevron();
  initialiseSlider(
    "gamma",
    (gamma) => {
      renderer.settings.gamma = gamma;
      renderer.updateSettings();
      renderer.render();
    },
    2
  );
}

function initialiseChevron(): void {
  const chevron = document.getElementById("chevron");
  const panel = document.getElementById("content");

  if (chevron === null) {
    throw new Error("Could not find chevron element");
  }

  if (panel === null) {
    throw new Error("Could not find info panel");
  }

  chevron.addEventListener("click", () => {
    chevron.classList.toggle("collapsed");
    panel.classList.toggle("collapsed");
  });
}

function initialiseSlider(
  id: string,
  updateRenderer: (value: number) => unknown,
  decimalPlaces: number = 2
): void {
  const sliderID = `${id}Input`;
  const valueDisplayID = `${id}Value`;
  const slider = document.getElementById(sliderID) as HTMLInputElement | null;
  const valueDisplay = document.getElementById(valueDisplayID);

  if (slider === null) {
    throw new Error(`Could not find slider with id ${sliderID}`);
  }

  if (valueDisplay === null) {
    throw new Error(`Could not find value display with id ${valueDisplay}`);
  }

  slider.addEventListener("change", () => {
    const value = parseFloat(slider.value);
    valueDisplay.textContent = `(${value.toFixed(decimalPlaces)})`;

    updateRenderer(value);
  });
}

export { initialiseConfigPanel };
