export type Vec3 = [number, number, number];

export type RegionId =
  | 'prefrontal' | 'frontal' | 'motor' | 'somato' | 'parietal' | 'visual' | 'temporal'
  | 'auditory' | 'broca' | 'wernicke' | 'hippocampus' | 'thalamus' | 'cerebellum' | 'brainstem';

export type ChemId = 'glutamate' | 'gaba' | 'dopamine' | 'serotonin' | 'acetylcholine';

export type Chemistry = Record<ChemId, number>;

export interface RegionDef {
  id: RegionId;
  name: string;
  color: Vec3;
  role: string;
  n: number;
}

export interface TaskDef {
  id: string;
  name: string;
  input: RegionId;
  output: RegionId;
  path: RegionId[];
  story: string;
}

export interface DrugDef {
  id: string;
  name: string;
  note: string;
  chem: Partial<Chemistry>;
  noiseMul: number;
  cond: number;
  thr: number;
}

export interface ChemDef {
  id: ChemId;
  name: string;
  desc: string;
}

export interface DamagePreset {
  id: string;
  name: string;
  note: string;
  regions: RegionId[];
  leftOf?: RegionId[];
  frac: number;
  chem?: Partial<Chemistry>;
}

export const REGIONS: RegionDef[] = [
  { id: 'prefrontal', name: 'Prefrontal cortex', color: [0.33, 0.55, 1.0], role: 'Planning, working memory, decisions', n: 100 },
  { id: 'frontal', name: 'Premotor cortex', color: [0.45, 0.70, 1.0], role: 'Movement planning and sequencing', n: 90 },
  { id: 'motor', name: 'Primary motor cortex', color: [1.0, 0.45, 0.35], role: 'Sends movement commands to the brainstem and spinal cord', n: 90 },
  { id: 'somato', name: 'Somatosensory cortex', color: [1.0, 0.70, 0.35], role: 'Touch, pressure, body position', n: 70 },
  { id: 'parietal', name: 'Parietal cortex', color: [0.95, 0.85, 0.35], role: 'Spatial attention, combining the senses', n: 100 },
  { id: 'visual', name: 'Visual cortex (V1)', color: [0.55, 0.35, 1.0], role: 'First cortical stop for signals from the eyes', n: 110 },
  { id: 'temporal', name: 'Temporal cortex', color: [0.35, 0.85, 0.55], role: 'Object recognition, meaning, memory', n: 90 },
  { id: 'auditory', name: 'Auditory cortex', color: [0.35, 0.95, 0.90], role: 'Sound processing', n: 60 },
  { id: 'broca', name: 'Broca’s area', color: [1.0, 0.35, 0.70], role: 'Speech production (left hemisphere)', n: 50 },
  { id: 'wernicke', name: 'Wernicke’s area', color: [0.95, 0.55, 1.0], role: 'Language comprehension (left hemisphere)', n: 50 },
  { id: 'hippocampus', name: 'Hippocampus', color: [0.60, 1.0, 0.40], role: 'Forms new memories; the first casualty in Alzheimer’s', n: 60 },
  { id: 'thalamus', name: 'Thalamus', color: [1.0, 0.92, 0.60], role: 'Relay hub: nearly all sensory input passes through it', n: 60 },
  { id: 'cerebellum', name: 'Cerebellum', color: [0.40, 0.80, 0.90], role: 'Coordination, balance, fine timing', n: 110 },
  { id: 'brainstem', name: 'Brainstem', color: [0.85, 0.85, 0.85], role: 'Breathing, heart rate; the output road to the body', n: 60 },
];

export const RI = Object.fromEntries(REGIONS.map((r, i) => [r.id, i])) as Record<RegionId, number>;

export const SUBCORTICAL: RegionId[] = ['hippocampus', 'thalamus', 'cerebellum', 'brainstem'];

export const PROJ_MUL = 4;

export const PATHWAYS: [RegionId, RegionId, number][] = [
  ['thalamus', 'visual', 60], ['thalamus', 'somato', 40], ['thalamus', 'auditory', 40], ['thalamus', 'motor', 40],
  ['brainstem', 'thalamus', 40], ['visual', 'parietal', 70], ['visual', 'temporal', 80], ['visual', 'prefrontal', 20],
  ['auditory', 'wernicke', 60], ['wernicke', 'broca', 70], ['wernicke', 'temporal', 40], ['temporal', 'wernicke', 30],
  ['broca', 'motor', 70], ['broca', 'frontal', 30], ['prefrontal', 'frontal', 80], ['frontal', 'motor', 90],
  ['somato', 'motor', 40], ['somato', 'parietal', 40], ['parietal', 'prefrontal', 50], ['parietal', 'frontal', 40],
  ['parietal', 'motor', 30], ['motor', 'brainstem', 120], ['motor', 'cerebellum', 40], ['frontal', 'cerebellum', 30], ['cerebellum', 'brainstem', 40],
  ['cerebellum', 'thalamus', 50], ['hippocampus', 'prefrontal', 50], ['hippocampus', 'temporal', 40],
  ['temporal', 'hippocampus', 50], ['prefrontal', 'hippocampus', 30], ['temporal', 'prefrontal', 50],
];

export const TASKS: TaskDef[] = [
  { id: 'see', name: 'See an object', input: 'visual', output: 'temporal', path: ['thalamus', 'visual', 'parietal', 'temporal', 'prefrontal'],
    story: 'Retinal signals reach V1 through the thalamus, then split into a dorsal “where” stream (parietal) and a ventral “what” stream (temporal), where the object is recognised.' },
  { id: 'hear', name: 'Hear a sentence', input: 'auditory', output: 'wernicke', path: ['thalamus', 'auditory', 'wernicke', 'temporal'],
    story: 'Sound arrives in auditory cortex and is decoded into meaning in Wernicke’s area, with help from temporal cortex.' },
  { id: 'speak', name: 'Say a word', input: 'wernicke', output: 'motor', path: ['wernicke', 'broca', 'motor', 'brainstem'],
    story: 'The word is retrieved in Wernicke’s area, sent along the arcuate fasciculus to Broca’s area for planning, then to motor cortex, which drives the tongue and larynx through the brainstem.' },
  { id: 'move', name: 'Reach with the right hand', input: 'prefrontal', output: 'brainstem', path: ['prefrontal', 'frontal', 'motor', 'cerebellum', 'brainstem'],
    story: 'Intent forms in prefrontal cortex, premotor cortex sequences the movement, left motor cortex fires, the cerebellum refines timing, and the brainstem carries the command down to the right arm.' },
  { id: 'recall', name: 'Recall a memory', input: 'hippocampus', output: 'prefrontal', path: ['hippocampus', 'temporal', 'prefrontal'],
    story: 'The hippocampus reactivates a stored pattern, temporal cortex fills in the content, and prefrontal cortex brings it into working memory.' },
];

export const DRUGS: DrugDef[] = [
  { id: 'none', name: 'Baseline', note: 'Normal chemistry.', chem: {}, noiseMul: 1, cond: 1, thr: 0 },
  { id: 'caffeine', name: 'Caffeine', note: 'Blocks adenosine: more arousal, slightly lower thresholds.', chem: {}, noiseMul: 1.25, cond: 1, thr: -1 },
  { id: 'alcohol', name: 'Alcohol', note: 'Boosts GABA, dampens glutamate, slows conduction. Cerebellum suffers most.', chem: { gaba: 1.15, glutamate: 0.9 }, noiseMul: 1, cond: 0.75, thr: 0 },
  { id: 'amphetamine', name: 'Amphetamine', note: 'Floods dopamine and noradrenaline: hyper-aroused, lower thresholds.', chem: { dopamine: 1.8 }, noiseMul: 1.3, cond: 1, thr: -1 },
  { id: 'ssri', name: 'SSRI', note: 'Raises serotonin: calmer background drive, little else acutely.', chem: { serotonin: 1.6 }, noiseMul: 1, cond: 1, thr: 0 },
  { id: 'ketamine', name: 'Ketamine', note: 'Blocks NMDA glutamate receptors: excitatory synapses lose most of their punch.', chem: { glutamate: 0.7 }, noiseMul: 1.2, cond: 1, thr: 0 },
  { id: 'propofol', name: 'General anaesthesia', note: 'Massive GABA potentiation. Tasks should fail completely.', chem: { gaba: 2.4, glutamate: 0.5 }, noiseMul: 0.3, cond: 1, thr: 0 },
  { id: 'bicuculline', name: 'GABA blocker', note: 'Removes inhibition. Expect runaway, seizure-like synchrony.', chem: { gaba: 0 }, noiseMul: 1, cond: 1, thr: 0 },
];

export const CHEMS: ChemDef[] = [
  { id: 'glutamate', name: 'Glutamate', desc: 'Main excitatory transmitter. Scales every excitatory synapse.' },
  { id: 'gaba', name: 'GABA', desc: 'Main inhibitory transmitter. Scales inhibitory synapses and raises thresholds.' },
  { id: 'dopamine', name: 'Dopamine', desc: 'Sharpens frontal and motor cortex and raises drive. Lost in Parkinson’s.' },
  { id: 'serotonin', name: 'Serotonin', desc: 'Quietens background noise.' },
  { id: 'acetylcholine', name: 'Acetylcholine', desc: 'Attention and learning; lowers thresholds a little. Depleted in Alzheimer’s.' },
];

export const DAMAGE_PRESETS: DamagePreset[] = [
  { id: 'mca', name: 'Left MCA stroke', note: 'Classic stroke: Broca’s, Wernicke’s, left motor and sensory cortex.', regions: ['broca', 'wernicke'], leftOf: ['motor', 'somato', 'auditory'], frac: 1 },
  { id: 'occipital', name: 'Occipital stroke', note: 'Posterior artery: cortical blindness.', regions: ['visual'], frac: 1 },
  { id: 'cerebellar', name: 'Cerebellar stroke', note: 'Loss of coordination and timing.', regions: ['cerebellum'], frac: 1 },
  { id: 'parkinson', name: 'Parkinson’s disease', note: 'Dopamine neurons in the midbrain die; dopamine drops to 50%.', regions: ['brainstem'], frac: 0.4, chem: { dopamine: 0.5 } },
  { id: 'hm', name: 'Hippocampal removal', note: 'Like patient H.M.: old skills survive, new memories cannot form.', regions: ['hippocampus'], frac: 1 },
];

export const DEGEN_ORDER: RegionId[] = ['hippocampus', 'temporal', 'wernicke', 'parietal', 'prefrontal', 'frontal', 'somato', 'motor', 'auditory', 'broca', 'visual'];

export const BASELINE_CHEMISTRY: Chemistry = { glutamate: 1, gaba: 1, dopamine: 1, serotonin: 1, acetylcholine: 1 };
