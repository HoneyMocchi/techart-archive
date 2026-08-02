registerLessonSection(String.raw`<section class="lesson" id="lesson-projection" data-topic="projection" data-title="카메라와 투영" data-desc="view, FOV, NDC">
  <div class="lesson-head">
    <p class="eyebrow">Math 05</p>
    <h1>카메라와 투영</h1>
    <p class="lead">3D 점은 카메라 기준 좌표로 바뀐 뒤 화면 평면에 투영됩니다. 가까운 물체가 커지는 이유는 x와 y가 깊이 z로 나누어지기 때문입니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>3D 큐브의 화면 투영</strong><span>perspective와 orthographic</span></div>
      <canvas class="visual-canvas" id="projectionCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">카메라</div>
        <label class="control">
          <span class="control-row">FOV <output data-value-for="projection.fov"></output></span>
          <input type="range" min="25" max="105" step="1" data-bind="projection.fov" />
        </label>
        <label class="control">
          <span class="control-row">거리 <output data-value-for="projection.distance"></output></span>
          <input type="range" min="3" max="9" step="0.1" data-bind="projection.distance" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">오브젝트</div>
        <label class="control">
          <span class="control-row">Yaw <output data-value-for="projection.yaw"></output></span>
          <input type="range" min="-70" max="70" step="1" data-bind="projection.yaw" />
        </label>
        <div class="segmented">
          <label>
            <input type="radio" name="projectionMode" value="perspective" data-bind="projection.mode" />
            <span>Perspective</span>
          </label>
          <label>
            <input type="radio" name="projectionMode" value="orthographic" data-bind="projection.mode" />
            <span>Ortho</span>
          </label>
        </div>
      </div>
    </div>
  </div>
  <div class="metrics" id="projectionMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="projectionNote"></p>
    <div class="formula">
      <code>clipPos = Projection * View * World * localPos</code>
      <code>ndc.xy = clip.xy / clip.w</code>
      <code>perspective scale = 1 / z</code>
    </div>
  </div>
</section>`);
