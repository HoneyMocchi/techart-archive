registerLessonSection(String.raw`<section class="lesson" id="lesson-gpu" data-topic="gpu" data-title="GPU 파이프라인과 메모리" data-desc="buffer, shader, bandwidth">
  <div class="lesson-head">
    <p class="eyebrow">Computer 03</p>
    <h1>GPU 파이프라인과 메모리</h1>
    <p class="lead">그래픽스 코드는 점, 삼각형, 픽셀, 텍스처를 거대한 배열로 다룹니다. 데이터 양과 처리 단계가 성능 감각의 출발점입니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>데이터 흐름과 작업량</strong><span>vertex, fragment, framebuffer</span></div>
      <canvas class="visual-canvas" id="gpuCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">화면</div>
        <label class="control">
          <span class="control-row">가로 픽셀 <output data-value-for="gpu.width"></output></span>
          <input type="range" min="640" max="3840" step="80" data-bind="gpu.width" />
        </label>
        <label class="control">
          <span class="control-row">세로 픽셀 <output data-value-for="gpu.height"></output></span>
          <input type="range" min="360" max="2160" step="45" data-bind="gpu.height" />
        </label>
        <label class="control">
          <span class="control-row">오버드로우 <output data-value-for="gpu.overdraw"></output></span>
          <input type="range" min="1" max="4" step="0.1" data-bind="gpu.overdraw" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">지오메트리</div>
        <label class="control">
          <span class="control-row">정점 수 <output data-value-for="gpu.vertices"></output></span>
          <input type="range" min="1000" max="200000" step="1000" data-bind="gpu.vertices" />
        </label>
        <label class="control">
          <span class="control-row">삼각형 수 <output data-value-for="gpu.triangles"></output></span>
          <input type="range" min="1000" max="300000" step="1000" data-bind="gpu.triangles" />
        </label>
      </div>
    </div>
  </div>
  <div class="metrics" id="gpuMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="gpuNote"></p>
    <div class="formula">
      <code>framebuffer bytes = width * height * 4</code>
      <code>fragment work = pixels * overdraw</code>
      <code>vertex buffer ≈ vertices * bytesPerVertex</code>
    </div>
  </div>
</section>`);
