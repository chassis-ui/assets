---
'@chassis-ui/assets': minor
---

`--subset` fixes the axes of a variable font that `axes` of `chassis.subset` names for a
brand, such as `"axes": { "chassis": { "opsz": 14 } }`. A font of the web output of the brand
that has the axis is written without it, as the font it is at that value. A font without the
axis, and every font of another brand, is subsetted as before. A value outside the axis of a
font fails the build, and an axis that no font of the brand has is a warning.

Changed, in a build with `--subset` only: `text.woff2` and `text-italic.woff2` of
`dist/web/docs/chassis/fonts/` have the optical size of Inter fixed at 14 and hold the weight
axis only. They are 136 KB and 146 KB where they were 208 KB and 230 KB. With the axis, a
browser draws text above 14 pixels in the display cut of Inter, 7% narrower at 57 pixels.

No file is added, removed or renamed, and the default build writes what it wrote.
