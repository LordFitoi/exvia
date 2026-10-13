// Mapbox paint values need a resolved color, while a token like --color-surface is a
// light-dark() pair; the computed `color` of a probe element is the resolved value.
export const resolveTokenColor = (token: string): string => {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

