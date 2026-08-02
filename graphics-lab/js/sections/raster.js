registerLessonSection(String.raw`<section class="lesson" id="lesson-raster" data-topic="raster" data-title="래스터화와 보간" data-desc="pixel, barycentric">
  <div class="lesson-head">
    <p class="eyebrow">Computer 01</p>
    <h1>래스터화와 보간</h1>
    <p class="lead">삼각형은 픽셀 격자 위에서 샘플링됩니다. 픽셀이 삼각형 안에 있으면 barycentric weight로 색, UV, 노멀 같은 값을 섞습니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>픽셀 격자와 barycentric weight</strong><span>삼각형 내부 판정과 색 보간</span></div>
      <canvas class="visual-canvas" id="rasterCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">샘플 위치</div>
        <label class="control">
          <span class="control-row">X <output data-value-for="raster.sampleX"></output></span>
          <input type="range" min="0" max="100" step="1" data-bind="raster.sampleX" />
        </label>
        <label class="control">
          <span class="control-row">Y <output data-value-for="raster.sampleY"></output></span>
          <input type="range" min="0" max="100" step="1" data-bind="raster.sampleY" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">격자</div>
        <label class="control">
          <span class="control-row">해상도 <output data-value-for="raster.resolution"></output></span>
          <input type="range" min="10" max="34" step="1" data-bind="raster.resolution" />
        </label>
      </div>
    </div>
  </div>
  <div class="metrics" id="rasterMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="rasterNote"></p>
    <div class="formula">
      <code>inside = w0 >= 0 && w1 >= 0 && w2 >= 0</code>
      <code>color = c0*w0 + c1*w1 + c2*w2</code>
      <code>fragment = covered pixel sample</code>
    </div>
  </div>
</section>`);
