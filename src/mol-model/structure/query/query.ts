/**
 * Copyright (c) 2017 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { Structure } from '../structure'
import { StructureSelection } from './selection'
import { QueryContext, QueryFn } from './context';

interface StructureQuery extends QueryFn<StructureSelection> { }
namespace StructureQuery {
    export function run(query: StructureQuery, structure: Structure, timeoutMs = 0) {
        return query(new QueryContext(structure, timeoutMs));
    }
}

export { StructureQuery }