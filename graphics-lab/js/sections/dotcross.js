registerLessonSection(String.raw`<section class="lesson" id="lesson-dotcross" data-topic="dotcross" data-title="내적과 외적" data-desc="방향성, 투영, 면적">
  <div class="lesson-head">
    <p class="eyebrow">Math 03</p>
    <h1>내적과 외적</h1>
    <p class="lead">내적은 두 방향이 얼마나 같은 쪽을 보는지, 외적은 두 벡터가 만드는 회전 방향과 면적이 얼마나 큰지를 보여줍니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>방향성, 투영, 회전 방향</strong><span>dot과 cross.z</span></div>
      <canvas class="visual-canvas" id="dotCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">벡터 A</div>
        <label class="control">
          <span class="control-row">각도 <output data-value-for="dotcross.aAngle"></output></span>
          <input type="range" min="-180" max="180" step="1" data-bind="dotcross.aAngle" />
        </label>
        <label class="control">
          <span class="control-row">길이 <output data-value-for="dotcross.aLength"></output></span>
          <input type="range" min="1" max="5.5" step="0.1" data-bind="dotcross.aLength" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">벡터 B</div>
        <label class="control">
          <span class="control-row">각도 <output data-value-for="dotcross.bAngle"></output></span>
          <input type="range" min="-180" max="180" step="1" data-bind="dotcross.bAngle" />
        </label>
        <label class="control">
          <span class="control-row">길이 <output data-value-for="dotcross.bLength"></output></span>
          <input type="range" min="1" max="5.5" step="0.1" data-bind="dotcross.bLength" />
        </label>
      </div>
    </div>
  </div>
  <div class="metrics" id="dotMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="dotNote"></p>
    <div class="formula">
      <code>dot(a,b) = |a||b|cos(theta)</code>
      <code>cross.z(a,b) = ax*by - ay*bx</code>
      <code>projection = dot(b, unitA)</code>
    </div>
  </div>
</section>`);
