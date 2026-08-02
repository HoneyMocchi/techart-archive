drawFns.vector = drawVector;
drawFns.trig = drawTrig;
drawFns.dotcross = drawDotCross;
drawFns.transform = drawTransform;
drawFns.projection = drawProjection;
drawFns.raster = drawRaster;
drawFns.texture = drawTexture;
drawFns.lighting = drawLighting;
drawFns.gpu = drawGpu;

buildNav();
injectAutoControls();
wireControls();
wireCanvasDrag();
syncInputs();
setActive(0);
window.addEventListener("resize", () => requestAnimationFrame(render));
