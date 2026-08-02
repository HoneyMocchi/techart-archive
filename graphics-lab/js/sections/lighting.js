registerLessonSection(String.raw`<section class="lesson" id="lesson-lighting" data-topic="lighting" data-title="노멀과 조명" data-desc="Lambert, specular">
  <div class="lesson-head">
    <p class="eyebrow">Math 06</p>
    <h1>노멀과 조명</h1>
    <p class="lead">표면 노멀과 빛 방향의 내적이 밝기를 만듭니다. 여기에 시선 방향과 하프 벡터를 더하면 하이라이트를 설명할 수 있습니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>Lambert diffuse와 specular</strong><span>노멀, 라이트, 뷰 방향</span></div>
      <canvas class="visual-canvas" id="lightingCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">방향</div>
        <label class="control">
          <span class="control-row">빛 각도 <output data-value-for="lighting.lightAngle"></output></span>
          <input type="range" min="-180" max="180" step="1" data-bind="lighting.lightAngle" />
        </label>
        <label class="control">
          <span class="control-row">표면 노멀 <output data-value-for="lighting.normalAngle"></output></span>
          <input type="range" min="-90" max="90" step="1" data-bind="lighting.normalAngle" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">재질</div>
        <label class="control">
          <span class="control-row">거칠기 <output data-value-for="lighting.roughness"></output></span>
          <input type="range" min="0.05" max="1" step="0.01" data-bind="lighting.roughness" />
        </label>
        <label class="control">
          <span class="control-row">환경광 <output data-value-for="lighting.ambient"></output></span>
          <input type="range" min="0" max="0.45" step="0.01" data-bind="lighting.ambient" />
        </label>
      </div>
    </div>
  </div>
  <div class="metrics" id="lightingMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="lightingNote"></p>
    <div class="formula">
      <code>diffuse = max(dot(N, L), 0)</code>
      <code>halfVector = normalize(L + V)</code>
      <code>specular = max(dot(N, H), 0)^power</code>
    </div>
  </div>
</section>`);
