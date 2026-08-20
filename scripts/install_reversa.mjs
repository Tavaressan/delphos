import { resolve } from 'node:path';
import { ENGINES } from 'npm:reversa@1.2.43/lib/installer/detector.js';
import { Writer } from 'npm:reversa@1.2.43/lib/installer/writer.js';
import { buildManifest, saveManifest } from 'npm:reversa@1.2.43/lib/installer/manifest.js';

const projectRoot = resolve('.');
const version = '1.2.43';

const selectedEngines = ENGINES.filter(e => e.id === 'antigravity');
const writer = new Writer(projectRoot);

const agents = [
  'reversa',
  'reversa-scout',
  'reversa-archaeologist',
  'reversa-architect',
  'reversa-arquitetura-3d',
  'reversa-audit',
  'reversa-clarify',
  'reversa-coding',
  'reversa-curator',
  'reversa-data-master',
  'reversa-design-system',
  'reversa-designer',
  'reversa-detective',
  'reversa-docs',
  'reversa-docs-analyst',
  'reversa-docs-mapper',
  'reversa-docs-publisher',
  'reversa-docs-storyteller',
  'reversa-drafter',
  'reversa-especialista-d3',
  'reversa-extract-soul',
  'reversa-forward',
  'reversa-highcharts-visualizer',
  'reversa-ideator',
  'reversa-image-prompt-json',
  'reversa-inspector',
  'reversa-migrate',
  'reversa-n8n',
  'reversa-new',
  'reversa-paradigm-advisor',
  'reversa-plan',
  'reversa-pricing-estimate',
  'reversa-pricing-profile',
  'reversa-pricing-size',
  'reversa-principles',
  'reversa-quality',
  'reversa-reconstructor',
  'reversa-requirements',
  'reversa-researcher',
  'reversa-resume',
  'reversa-reviewer',
  'reversa-scout',
  'reversa-screen-translator',
  'reversa-selo-generativo',
  'reversa-spec-sdd',
  'reversa-strategist',
  'reversa-to-do',
  'reversa-visor',
  'reversa-writer'
];

const answers = {
  engines: ['antigravity'],
  teams: ['discovery', 'migration', 'forward', 'newproject', 'docs', 'pricing'],
  project_name: 'alfabra_vector',
  user_name: 'Vitor Tavares',
  chat_language: 'pt-br',
  doc_language: 'Português',
  output_folder: '_reversa_sdd',
  git_strategy: 'commit',
  answer_mode: 'chat',
  agents: agents
};

console.log('Installing agents skills...');
for (const agent of agents) {
  for (const engine of selectedEngines) {
    await writer.installSkill(agent, engine.skillsDir);
    if (engine.universalSkillsDir && engine.universalSkillsDir !== engine.skillsDir) {
      await writer.installSkill(agent, engine.universalSkillsDir);
    }
  }
}

console.log('Installing entry file...');
for (const engine of selectedEngines) {
  if (!engine.entryFile) continue;
  await writer.installEntryFile(engine, { force: true });
}

console.log('Creating .reversa structure...');
writer.createReversaDir(answers, version);

console.log('Generating files-manifest...');
const newManifest = buildManifest(projectRoot, writer.manifestPaths);
saveManifest(projectRoot, newManifest);

writer.saveCreatedFiles();
console.log('Installation completed programmatically!');
