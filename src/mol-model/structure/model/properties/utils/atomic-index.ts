/**
 * Copyright (c) 2017 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { AtomicData, AtomicSegments } from '../atomic'
import { Interval, Segmentation, SortedArray } from 'mol-data/int'
import { Entities } from '../common'
import { ChainIndex, ResidueIndex, EntityIndex } from '../../indexing';
import { AtomicIndex, AtomicHierarchy } from '../atomic/hierarchy';
import { cantorPairing } from 'mol-data/util';

function getResidueId(seq_id: number, ins_code: string) {
    if (!ins_code) return seq_id;
    if (ins_code.length === 1) return cantorPairing(ins_code.charCodeAt(0), seq_id);
    if (ins_code.length === 2) return cantorPairing(ins_code.charCodeAt(0), cantorPairing(ins_code.charCodeAt(1), seq_id));
    return `${seq_id} ${ins_code}`;
}

function updateMapMapIndex<K, I extends number>(map: Map<K, Map<string, I>>, key0: K, key1: string, index: I) {
    if (map.has(key0)) {
        const submap = map.get(key0)!;
        if (!submap.has(key1)) {
            submap.set(key1, index);
        }
    } else {
        const submap = new Map<string, I>();
        map.set(key0, submap);
        submap.set(key1, index);
    }
}

function missingEntity(k: string) {
    throw new Error(`Missing entity entry for entity id '${k}'.`);
}

interface Mapping {
    entities: Entities,
    label_seq_id: SortedArray,
    segments: AtomicSegments,

    chain_index_entity_index: EntityIndex[],

    entity_index_label_asym_id: Map<EntityIndex, Map<string, ChainIndex>>,
    chain_index_label_seq_id: Map<ChainIndex, Map<string | number, ResidueIndex>>,

    auth_asym_id: Map<string, ChainIndex>,
    chain_index_auth_seq_id: Map<ChainIndex, Map<string | number, ResidueIndex>>,
}

function createMapping(entities: Entities, data: AtomicData, segments: AtomicSegments): Mapping {
    return {
        entities,
        segments,
        label_seq_id: SortedArray.ofSortedArray(data.residues.label_seq_id.toArray({ array: Int32Array })),
        chain_index_entity_index: new Int32Array(data.chains._rowCount) as any,
        entity_index_label_asym_id: new Map(),
        chain_index_label_seq_id: new Map(),
        auth_asym_id: new Map(),
        chain_index_auth_seq_id: new Map(),
    };
}

const _tempResidueKey = AtomicIndex.EmptyResidueKey();
class Index implements AtomicIndex {
    private entityIndex: Entities['getEntityIndex'];

    getEntityFromChain(cI: ChainIndex): EntityIndex {
        return this.map.chain_index_entity_index[cI];
    }

    findChainLabel(key: AtomicIndex.ChainLabelKey): ChainIndex {
        const eI = this.entityIndex(key.label_entity_id);
        if (eI < 0 || !this.map.entity_index_label_asym_id.has(eI)) return -1 as ChainIndex;
        const cm = this.map.entity_index_label_asym_id.get(eI);
        if (!cm) return -1 as ChainIndex;
        return cm.has(key.label_asym_id) ? cm.get(key.label_asym_id)! : -1 as ChainIndex;
    }

    findChainAuth(key: AtomicIndex.ChainAuthKey): ChainIndex {
        return this.map.auth_asym_id.has(key.auth_asym_id) ? this.map.auth_asym_id.get(key.auth_asym_id)! : -1 as ChainIndex;
    }

    findResidue(label_entity_id: string, label_asym_id: string, auth_seq_id: number, pdbx_PDB_ins_code?: string): ResidueIndex
    findResidue(key: AtomicIndex.ResidueKey): ResidueIndex
    findResidue(label_entity_id_or_key: string | AtomicIndex.ResidueKey, label_asym_id?: string, auth_seq_id?: number, pdbx_PDB_ins_code?: string): ResidueIndex {
        let key: AtomicIndex.ResidueKey;
        if (arguments.length === 1) {
            key = label_entity_id_or_key as AtomicIndex.ResidueKey
        } else {
            _tempResidueKey.label_entity_id = label_entity_id_or_key as string;
            _tempResidueKey.label_asym_id = label_asym_id!;
            _tempResidueKey.auth_seq_id = auth_seq_id!;
            _tempResidueKey.pdbx_PDB_ins_code = pdbx_PDB_ins_code;
            key = _tempResidueKey;
        }
        const cI = this.findChainLabel(key);
        if (cI < 0) return -1 as ResidueIndex;
        const rm = this.map.chain_index_auth_seq_id.get(cI)!;
        const id = getResidueId(key.auth_seq_id, key.pdbx_PDB_ins_code || '');
        return rm.has(id) ? rm.get(id)! : -1 as ResidueIndex;
    }

    findResidueAuth(key: AtomicIndex.ResidueAuthKey): ResidueIndex {
        const cI = this.findChainAuth(key);
        if (cI < 0) return -1 as ResidueIndex;
        const rm = this.map.chain_index_auth_seq_id.get(cI)!;
        const id = getResidueId(key.auth_seq_id, key.pdbx_PDB_ins_code || '');
        return rm.has(id) ? rm.get(id)! : -1 as ResidueIndex;
    }

    findResidueInsertion(key: AtomicIndex.ResidueLabelKey): ResidueIndex {
        const cI = this.findChainLabel(key);
        if (cI < 0) return -1 as ResidueIndex;
        const rm = this.map.chain_index_label_seq_id.get(cI)!;
        const id = getResidueId(key.label_seq_id, key.pdbx_PDB_ins_code || '');
        if (rm.has(id)) return rm.get(id)!;

        const idx = SortedArray.findPredecessorIndex(this.map.label_seq_id, key.label_seq_id) as ResidueIndex;
        const start = AtomicHierarchy.chainStartResidueIndex(this.map.segments, cI);
        if (idx < start) return start;
        const end = AtomicHierarchy.chainEndResidueIndexExcl(this.map.segments, cI) - 1 as ResidueIndex;
        if (idx >= end) return end;
        return idx;
    }

    constructor(private map: Mapping) {
        this.entityIndex = map.entities.getEntityIndex;
    }
}

export function getAtomicIndex(data: AtomicData, entities: Entities, segments: AtomicSegments): AtomicIndex {
    const map = createMapping(entities, data, segments);

    const { label_seq_id, auth_seq_id, pdbx_PDB_ins_code } = data.residues;
    const { label_entity_id, label_asym_id, auth_asym_id } = data.chains;

    const atomSet = Interval.ofBounds(0, data.atoms._rowCount);
    const chainsIt = Segmentation.transientSegments(segments.chainAtomSegments, atomSet);
    while (chainsIt.hasNext) {
        const chainSegment = chainsIt.move();
        const chainIndex = chainSegment.index;

        let entityIndex = entities.getEntityIndex(label_entity_id.value(chainIndex));
        if (entityIndex < 0) missingEntity(label_entity_id.value(chainIndex));
        map.chain_index_entity_index[chainIndex] = entityIndex;

        const authAsymId = auth_asym_id.value(chainIndex);
        if (!map.auth_asym_id.has(authAsymId)) map.auth_asym_id.set(authAsymId, chainIndex);

        updateMapMapIndex(map.entity_index_label_asym_id, entityIndex, label_asym_id.value(chainIndex), chainIndex);

        const chain_index_label_seq_id = new Map<string | number, ResidueIndex>();
        const chain_index_auth_seq_id = new Map<string | number, ResidueIndex>();
        map.chain_index_label_seq_id.set(chainIndex, chain_index_label_seq_id);
        map.chain_index_auth_seq_id.set(chainIndex, chain_index_auth_seq_id);

        const residuesIt = Segmentation.transientSegments(segments.residueAtomSegments, atomSet, chainSegment);
        while (residuesIt.hasNext) {
            const residueSegment = residuesIt.move();
            const rI = residueSegment.index;
            const insCode = pdbx_PDB_ins_code.value(rI);
            chain_index_label_seq_id.set(getResidueId(label_seq_id.value(rI), insCode), rI);
            chain_index_auth_seq_id.set(getResidueId(auth_seq_id.value(rI), insCode), rI);
        }
    }

    return new Index(map);
}