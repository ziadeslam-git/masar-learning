import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMBIGUITY_TIMER_MINUTES, REVERSE_ITEMS, SKILLS_TEST_TIMER_MINUTES } from '../artifacts/masar-learning/src/lib/config.ts';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '..');
const sourceDirectory = resolve(workspaceRoot, 'content/source');
const outputDirectory = resolve(workspaceRoot, 'content');
const appDataDirectory = resolve(workspaceRoot, 'artifacts/masar-learning/src/data');
const scaleLabels = ['موافق بشدة', 'موافق', 'محايد', 'معارض', 'معارض بشدة'];

function toAsciiDigits(value: string) {
  return value.replace(/[٠-٩]/gu, digit => String(digit.charCodeAt(0) - 0x0660));
}

function readFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) throw new Error('Assessment source must begin with YAML front matter.');
  return { yaml: match[1], body: source.slice(match[0].length) };
}

function yamlString(yaml: string, key: string) {
  const match = yaml.match(new RegExp(`^${key}:\\s*["']([^"']*)["']\\s*$`, 'mu'));
  return match?.[1] ?? '';
}

function readAnswerKey(yaml: string) {
  const lines = yaml.split(/\r?\n/u);
  const start = lines.findIndex(line => /^\s{2}answer_key:\s*$/u.test(line));
  if (start < 0) return {};
  const answerKey: Record<string, string> = {};
  for (let index = start + 1; index < lines.length && /^\s{4,}\S/u.test(lines[index]); index += 1) {
    const match = lines[index].match(/^\s{4}([0-9٠-٩]+):\s*["']?([^"'\s]+)["']?\s*$/u);
    if (match) answerKey[toAsciiDigits(match[1])] = normalizeOptionKey(match[2]);
  }
  return answerKey;
}

function readDimensions(yaml: string) {
  const dimensions: Array<{ name: string; items: number[] }> = [];
  const expression = /^\s{4}-\s*name:\s*"([^"]+)"\s*\r?\n\s{6}items:\s*\[([^\]]*)\]/gmu;
  for (const match of yaml.matchAll(expression)) {
    const items = match[2].split(',').map(value => value.trim()).filter(Boolean).map(value => Number(toAsciiDigits(value)));
    dimensions.push({ name: match[1], items });
  }
  return dimensions;
}

function normalizeOptionKey(key: string) {
  return /^[إآا]$/u.test(key) ? 'أ' : key;
}

function findSection(body: string, heading: string, nextHeading: string) {
  const startExpression = new RegExp(`^${heading}\\s*$`, 'mu');
  const nextExpression = new RegExp(`^${nextHeading}\\s*$`, 'mu');
  const start = body.match(startExpression);
  if (!start || start.index === undefined) return '';
  const contentStart = start.index + start[0].length;
  const remaining = body.slice(contentStart);
  const next = remaining.match(nextExpression);
  return (next?.index === undefined ? remaining : remaining.slice(0, next.index)).trim();
}

function instructionBlocks(source: string) {
  return source
    .replace(/^#{1,6}\s+.*$/gmu, '')
    .split(/\r?\n\s*\r?\n/u)
    .map(block => block.split(/\r?\n/u).map(line => line.trim()).filter(Boolean))
    .flat()
    .filter(line => !/^الأسم\s*[:：]/u.test(line))
    .map(line => line.replace(/^-\s*/u, '').trim())
    .filter(Boolean);
}

function parseQuestionSections(body: string) {
  const headerExpression = /^###\s*س\s*([0-9٠-٩]+)\s*$/gmu;
  const headers = [...body.matchAll(headerExpression)];
  return headers.map((header, index) => {
    const number = Number(toAsciiDigits(header[1]));
    const start = (header.index ?? 0) + header[0].length;
    const end = headers[index + 1]?.index ?? body.length;
    return { number, body: body.slice(start, end).trim() };
  });
}

function parseOptions(questionBody: string) {
  const options: Array<{ key: string; text: string }> = [];
  for (const line of questionBody.split(/\r?\n/u)) {
    const match = line.match(/^\s*-\s*([أإآابجد])\)\s*(.+?)\s*$|^\s*-\s*([أإآابجد])\s+(.+?)\s*$/u);
    if (!match) continue;
    const key = normalizeOptionKey(match[1] ?? match[3]);
    const text = (match[2] ?? match[4]).trim();
    if (key && text) options.push({ key, text });
  }
  return options;
}

function parseSkillsQuestion(question: { number: number; body: string }) {
  const prompt = question.body.split(/\r?\n\s*\r?\n/u)[0]?.trim() ?? '';
  const dimension = question.body.match(/^\s*-\s*البعد:\s*(.+?)\s*$/mu)?.[1]?.trim() ?? '';
  const answer = normalizeOptionKey(question.body.match(/^\s*-\s*الإجابة الصحيحة:\s*([أإآابجد])\s*$/mu)?.[1] ?? '');
  return {
    id: `q${question.number}`,
    number: question.number,
    prompt,
    dimension,
    options: parseOptions(question.body),
    answer,
  };
}

function assertSequence(numbers: number[], expectedCount: number, title: string) {
  if (numbers.length !== expectedCount) {
    throw new Error(`${title}: expected ${expectedCount} questions, found ${numbers.length}.`);
  }
  numbers.forEach((number, index) => {
    if (number !== index + 1) throw new Error(`${title}: question numbers must be sequential from 1; expected ${index + 1}, found ${number}.`);
  });
}

export function parseAssessmentSource(source: string) {
  const { yaml, body } = readFrontmatter(source);
  const title = yamlString(yaml, 'title');
  const type = yamlString(yaml, 'type');
  const expectedCount = Number(yaml.match(/^total_questions:\s*([0-9٠-٩]+)/mu)?.[1] ? toAsciiDigits(yaml.match(/^total_questions:\s*([0-9٠-٩]+)/mu)![1]) : NaN);
  const sections = parseQuestionSections(body);
  assertSequence(sections.map(section => section.number), expectedCount, title || 'Assessment');

  const instructionSection = findSection(body, '## تعليمات الاختبار', '## الأسئلة');
  if (type === 'scale') {
    const introduction = findSection(body, '## تعليمات الاختبار', '### تعليمات المقياس');
    const scaleInstructions = findSection(body, '### تعليمات المقياس', '## الأسئلة');
    const options = scaleLabels.map((label, index) => ({ value: 5 - index, label }));
    if (sections.length !== 20) throw new Error(`${title}: the ambiguity scale must contain exactly 20 statements.`);
    return {
      type,
      title,
      durationMinutes: AMBIGUITY_TIMER_MINUTES,
      instructionIntro: instructionBlocks(introduction),
      instructions: instructionBlocks(scaleInstructions),
      responseOptions: options,
      questions: sections.map(section => {
        const prompt = section.body.split(/\r?\n\s*\r?\n/u)[0]?.trim() ?? '';
        return { id: `q${section.number}`, number: section.number, prompt, reverse: REVERSE_ITEMS.some(number => number === section.number) };
      }),
    };
  }

  if (type !== 'skills') throw new Error(`Unsupported assessment type "${type || '(missing)'}".`);
  const answerKey = readAnswerKey(yaml);
  const dimensions = readDimensions(yaml);
  const questions = sections.map(parseSkillsQuestion);
  if (questions.length !== 25) throw new Error(`${title}: the skills test must contain exactly 25 questions.`);
  if (Object.keys(answerKey).length !== 25 || Array.from({ length: 25 }, (_, index) => String(index + 1)).some(number => !(number in answerKey))) {
    throw new Error(`${title}: scoring.answer_key must cover question numbers 1–25 exactly.`);
  }
  if (dimensions.length !== 5) throw new Error(`${title}: the skills test must define exactly five dimensions.`);

  const expectedOptionKeys = ['أ', 'ب', 'ج', 'د'];
  for (const question of questions) {
    if (!question.prompt) throw new Error(`${title}: question ${question.number} has no statement.`);
    if (question.options.length !== 4 || new Set(question.options.map(option => option.key)).size !== 4
      || expectedOptionKeys.some(key => !question.options.some(option => option.key === key))) {
      throw new Error(`${title}: question ${question.number} must have four unique options (أ، ب، ج، د).`);
    }
    if (!question.dimension || !dimensions.some(dimension => dimension.name === question.dimension)) {
      throw new Error(`${title}: question ${question.number} has an unknown or missing dimension.`);
    }
    if (!question.answer || question.answer !== answerKey[String(question.number)]) {
      throw new Error(`${title}: answer key mismatch for question ${question.number}.`);
    }
  }
  for (const dimension of dimensions) {
    const assigned = questions.filter(question => question.dimension === dimension.name).map(question => question.number);
    if (dimension.items.length !== 5 || assigned.length !== 5 || dimension.items.some(number => !assigned.includes(number))) {
      throw new Error(`${title}: dimension "${dimension.name}" must contain the five matching question numbers.`);
    }
  }

  return {
    type,
    title,
    durationMinutes: SKILLS_TEST_TIMER_MINUTES,
    instructions: instructionBlocks(instructionSection),
    dimensions,
    answerKey,
    questions: questions.map(({ answer: _answer, ...question }) => question),
  };
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function buildAssessments() {
  const ambiguitySource = readFileSync(resolve(sourceDirectory, 'ambiguity-scale.md'), 'utf8');
  const skillsSource = readFileSync(resolve(sourceDirectory, 'design-thinking-test.md'), 'utf8');
  const ambiguity = parseAssessmentSource(ambiguitySource);
  const skills = parseAssessmentSource(skillsSource);
  if (ambiguity.type !== 'scale' || skills.type !== 'skills') {
    throw new Error('Expected one scale source and one skills-test source.');
  }

  writeJson(resolve(outputDirectory, 'assessment-ambiguity.json'), ambiguity);
  writeJson(resolve(outputDirectory, 'assessment-design-thinking.json'), skills);
  writeJson(resolve(appDataDirectory, 'assessment-ambiguity.json'), ambiguity);
  writeJson(resolve(appDataDirectory, 'assessment-design-thinking.json'), skills);
  return { ambiguity, skills };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { ambiguity, skills } = buildAssessments();
  console.log(`Generated ${ambiguity.questions.length} ambiguity statements and ${skills.questions.length} skills questions.`);
}
