import { RI } from '../sim/catalog';
import { NO_NODE } from '../sim/layout';

export interface NeuronAnatomy {
  node: ArrayLike<number>;
  region: ArrayLike<number>;
  hemi: ArrayLike<number>;
}

const HIPPOCAMPAL_NEIGHBOURS = ['entorhinal', 'parahippocampal'];

/**
 * Fraction of loss for every spiking neuron given loss per atlas region. Cortical neurons take
 * their own region's loss. The hippocampus, which the cortical atlas leaves out, follows its
 * entorhinal and parahippocampal neighbours on the same side. Other deep structures are spared.
 */
export function neuronAtrophy(
  anatomy: NeuronAnatomy,
  nodes: { label: string; hemi: 'L' | 'R' }[],
  nodeLoss: ArrayLike<number>,
): Float32Array {
  const side = (hemi: 'L' | 'R') => {
    const idx = nodes.flatMap((n, i) => (n.hemi === hemi && HIPPOCAMPAL_NEIGHBOURS.includes(n.label) ? [i] : []));
    return idx.length ? idx.reduce((a, i) => a + nodeLoss[i], 0) / idx.length : 0;
  };
  const hippocampus = { L: side('L'), R: side('R') };
  const out = new Float32Array(anatomy.node.length);
  for (let i = 0; i < out.length; i++) {
    const node = anatomy.node[i];
    if (node !== NO_NODE) out[i] = nodeLoss[node];
    else if (anatomy.region[i] === RI.hippocampus) out[i] = anatomy.hemi[i] < 0 ? hippocampus.L : hippocampus.R;
  }
  return out;
}
