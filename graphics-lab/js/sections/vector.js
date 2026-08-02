registerLessonSection(String.raw`<section class="lesson active" id="lesson-vector" data-topic="vector" data-title="벡터와 좌표" data-desc="방향, 길이, 성분">
  <div class="lesson-head">
    <p class="eyebrow">Math 01</p>
    <h1>벡터와 좌표</h1>
    <p class="lead">점은 위치이고 벡터는 변화량입니다. 이동, 속도, 노멀, 라이트 방향, 카메라 방향은 대부분 벡터로 표현됩니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>2D 좌표계와 성분 분해</strong><span>x, y 성분과 단위 벡터</span></div>
      <canvas class="visual-canvas" id="vectorCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">벡터</div>
        <label class="control">
          <span class="control-row">각도 <output data-value-for="vector.angle"></output></span>
          <input type="range" min="-180" max="180" step="1" data-bind="vector.angle" />
        </label>
        <label class="control">
          <span class="control-row">길이 <output data-value-for="vector.length"></output></span>
          <input type="range" min="0.5" max="6" step="0.1" data-bind="vector.length" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">좌표 격자</div>
        <label class="control">
          <span class="control-row">확대 <output data-value-for="vector.zoom"></output></span>
          <input type="range" min="32" max="62" step="1" data-bind="vector.zoom" />
        </label>
      </div>
    </div>
  </div>
  <div class="metrics" id="vectorMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="vectorNote"></p>
    <div class="formula">
      <code>v = (x, y)</code>
      <code>|v| = sqrt(x*x + y*y)</code>
      <code>normalize(v) = v / |v|</code>
    </div>
  </div>
</section>`);
