registerLessonSection(String.raw`<section class="lesson" id="lesson-transform" data-topic="transform" data-title="행렬 변환" data-desc="scale, rotate, translate">
  <div class="lesson-head">
    <p class="eyebrow">Math 04</p>
    <h1>행렬 변환</h1>
    <p class="lead">모델의 점들은 스케일, 회전, 이동을 거쳐 월드 좌표로 갑니다. 행렬은 이 과정을 숫자 표 하나로 묶어 GPU에 보내기 좋게 만듭니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>모델 공간에서 월드 공간으로</strong><span>TRS 변환과 3x3 행렬</span></div>
      <canvas class="visual-canvas" id="transformCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">스케일</div>
        <label class="control">
          <span class="control-row">X <output data-value-for="transform.scaleX"></output></span>
          <input type="range" min="0.25" max="2.2" step="0.05" data-bind="transform.scaleX" />
        </label>
        <label class="control">
          <span class="control-row">Y <output data-value-for="transform.scaleY"></output></span>
          <input type="range" min="0.25" max="2.2" step="0.05" data-bind="transform.scaleY" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">회전과 이동</div>
        <label class="control">
          <span class="control-row">회전 <output data-value-for="transform.rotation"></output></span>
          <input type="range" min="-180" max="180" step="1" data-bind="transform.rotation" />
        </label>
        <label class="control">
          <span class="control-row">이동 X <output data-value-for="transform.tx"></output></span>
          <input type="range" min="-3" max="3" step="0.1" data-bind="transform.tx" />
        </label>
        <label class="control">
          <span class="control-row">이동 Y <output data-value-for="transform.ty"></output></span>
          <input type="range" min="-2.5" max="2.5" step="0.1" data-bind="transform.ty" />
        </label>
      </div>
    </div>
  </div>
  <div class="metrics" id="transformMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="transformNote"></p>
    <div class="formula">
      <code>worldPos = T * R * S * localPos</code>
      <code>determinant = scaleX * scaleY</code>
      <code>homogeneous point = (x, y, 1)</code>
    </div>
  </div>
</section>`);
