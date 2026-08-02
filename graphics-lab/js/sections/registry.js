const lessonSectionTemplates = [];

function registerLessonSection(markup) {
  lessonSectionTemplates.push(markup.trim());
}

function renderLessonSections() {
  document.getElementById("lessonRoot").innerHTML = lessonSectionTemplates.join("\n\n");
}