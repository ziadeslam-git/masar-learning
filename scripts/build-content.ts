import fs from "node:fs/promises";
import path from "node:path";

const root = import.meta.dirname;
const sourcePath = path.resolve(
  root,
  "../attached_assets/تكنولوجيا_التعليم_والتحول_الرقمي_أربعة_فصول_منظف_1791493489673.md",
);
const outputDir = path.resolve(root, "../artifacts/masar-learning/src/data");
const source = await fs.readFile(sourcePath, "utf8");
const lines = source.split(/\r?\n/);
const originalChapterIds = [2, 4, 5, 6];
const chapters = [];
let chapter = null;
let lesson = null;

for (const line of lines) {
  const chapterHeading = line.match(/^# (?!#)(.+?)\s*$/);
  if (chapterHeading) {
    chapter = {
      id: originalChapterIds[chapters.length],
      order: chapters.length + 1,
      title: chapterHeading[1].trim(),
      lessons: [],
    };
    if (chapter.id === undefined) {
      throw new Error("Curriculum has more chapters than the supported four.");
    }
    chapters.push(chapter);
    lesson = null;
    continue;
  }

  const lessonHeading = line.match(/^## (?!#)(.+?)\s*$/);
  if (lessonHeading && chapter) {
    lesson = {
      id: `${chapter.order}.${chapter.lessons.length + 1}`,
      title: lessonHeading[1].trim(),
      markdown: "",
    };
    chapter.lessons.push(lesson);
    continue;
  }

  if (lesson) lesson.markdown += `${line}\n`;
}

const expectedCounts = [10, 13, 7, 8];
if (
  chapters.length !== 4 ||
  chapters.some((item, index) => item.lessons.length !== expectedCounts[index])
) {
  throw new Error(
    `Unexpected curriculum structure: ${chapters.length} chapters; lesson counts ${chapters.map((item) => item.lessons.length).join("/")}. Expected 4 chapters with 10/13/7/8 lessons.`,
  );
}

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(outputDir, "curriculum.json"),
  `${JSON.stringify({ chapters }, null, 2)}\n`,
  "utf8",
);
console.info(
  `Generated curriculum with ${chapters.length} chapters and ${chapters.reduce((sum, item) => sum + item.lessons.length, 0)} lessons.`,
);
