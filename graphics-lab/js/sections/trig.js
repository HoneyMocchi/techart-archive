registerLessonSection(String.raw`<section class="lesson" id="lesson-trig" data-topic="trig" data-title="삼각함수와 회전" data-desc="sin, cos, radian">
  <div class="lesson-head">
    <p class="eyebrow">Math 02</p>
    <h1>삼각함수와 회전</h1>
    <p class="lead">sin과 cos는 원 위의 점을 x/y 좌표로 풀어내는 함수입니다. 회전, 파동, 애니메이션 타이밍, 원형 카메라 이동의 기본이 됩니다.</p>
  </div>
  <div class="workspace">
    <div class="visual-panel">
      <div class="visual-toolbar"><strong>단위원과 파형</strong><span>각도와 라디안, sin/cos 값</span></div>
      <canvas class="visual-canvas" id="trigCanvas"></canvas>
    </div>
    <div class="control-panel">
      <div class="control-group">
        <div class="control-title">각도</div>
        <label class="control">
          <span class="control-row">도 단위 <output data-value-for="trig.angle"></output></span>
          <input type="range" min="0" max="360" step="1" data-bind="trig.angle" />
        </label>
        <label class="control">
          <span class="control-row">반지름 <output data-value-for="trig.radius"></output></span>
          <input type="range" min="0.5" max="1.6" step="0.05" data-bind="trig.radius" />
        </label>
      </div>
      <div class="control-group">
        <div class="control-title">파형</div>
        <label class="control">
          <span class="control-row">주기 배율 <output data-value-for="trig.frequency"></output></span>
          <input type="range" min="0.5" max="3" step="0.1" data-bind="trig.frequency" />
        </label>
      </div>
    </div>
  </div>
  <div class="metrics" id="trigMetrics"></div>
  <div class="note-panel">
    <strong>핵심 감각</strong>
    <p id="trigNote"></p>
    <div class="formula">
      <code>x = cos(theta) * r</code>
      <code>y = sin(theta) * r</code>
      <code>radian = degree * PI / 180</code>
    </div>
  </div>
</section>`);
