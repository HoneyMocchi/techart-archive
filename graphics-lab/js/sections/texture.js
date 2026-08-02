registerLessonSection(String.raw`<section class="lesson" id="lesson-texture" data-topic="texture" data-title="UV와 텍스처 샘플링" data-desc="UV, wrap, filtering">
  <div class="lesson-head">
    <p class="eyebrow">Computer 02</p>
    <h1>UV와 텍스처 샘플링</h1>
    <p class="lead">UV는 표면 위 좌표를 텍스처 이미지 좌표에 연결합니다. 필터링 방식이 바뀌면 같은 UV라도 색을 읽는 방식이 달라집니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>텍셀, UV 반복, 필터</strong><span>nearest와 bilinear 비교</span></div>
      <canvas class="visual-canvas" id="textureCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">UV</div>
        <label class="control">
          <span class="control-row">U <output data-value-for="texture.u"></output></span>
          <input type="range" min="0" max="1" step="0.01" data-bind="texture.u" />
        </label>
        <label class="control">
          <span class="control-row">V <output data-value-for="texture.v"></output></span>
          <input type="range" min="0" max="1" step="0.01" data-bind="texture.v" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">샘플링</div>
        <label class="control">
          <span class="control-row">반복 <output data-value-for="texture.tiling"></output></span>
          <input type="range" min="1" max="8" step="1" data-bind="texture.tiling" />
        </label>
        <div class="segmented">
          <label>
            <input type="radio" name="textureFilter" value="nearest" data-bind="texture.filter" />
            <span>Nearest</span>
          </label>
          <label>
            <input type="radio" name="textureFilter" value="bilinear" data-bind="texture.filter" />
            <span>Bilinear</span>
          </label>
        </div>
      </div>
    </div>
  </div>
  <div class="metrics" id="textureMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="textureNote"></p>
    <div class="formula">
      <code>texel = texture[wrap(uv * tiling)]</code>
      <code>nearest = closest texel</code>
      <code>bilinear = lerp four texels</code>
    </div>
  </div>
</section>`);
