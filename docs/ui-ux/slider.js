// Demo only: the guide has no framework, so this mirrors each slider's value
// into --value, which the CSS uses for the filled part of the rail.
const PERCENT = 100;

function syncSliderFill(slider) {
  const share = (slider.value - slider.min) / (slider.max - slider.min);
  slider.style.setProperty("--value", `${share * PERCENT}%`);
}

document.querySelectorAll(".slider").forEach((slider) => {
  syncSliderFill(slider);
  slider.addEventListener("input", () => syncSliderFill(slider));
});
