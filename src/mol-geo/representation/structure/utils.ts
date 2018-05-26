/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { Unit } from 'mol-model/structure';
import { Mat4 } from 'mol-math/linear-algebra'

import { createUniformColor, ColorData } from '../../util/color-data';
import { createUniformSize } from '../../util/size-data';
import { elementSizeData } from '../../theme/structure/size/element';
import VertexMap from '../../shape/vertex-map';
import { ColorTheme, SizeTheme } from '../../theme';
import { elementIndexColorData, elementSymbolColorData, instanceIndexColorData, chainIdColorData } from '../../theme/structure/color';
import { ValueCell } from 'mol-util';

export function createTransforms({ units }: Unit.SymmetryGroup, transforms?: ValueCell<Float32Array>) {
    const unitCount = units.length
    const n = unitCount * 16
    const array = transforms && transforms.ref.value.length >= n ? transforms.ref.value : new Float32Array(n)
    for (let i = 0; i < unitCount; i++) {
        Mat4.toArray(units[i].conformation.operator.matrix, array, i * 16)
    }
    return transforms ? ValueCell.update(transforms, array) : ValueCell.create(array)
}

export function createColors(group: Unit.SymmetryGroup, vertexMap: VertexMap, props: ColorTheme, colorData?: ColorData) {
    switch (props.name) {
        case 'atom-index':
            return elementIndexColorData({ group, vertexMap }, colorData)
        case 'chain-id':
            return chainIdColorData({ group, vertexMap }, colorData)
        case 'element-symbol':
            return elementSymbolColorData({ group, vertexMap }, colorData)
        case 'instance-index':
            return instanceIndexColorData({ group, vertexMap }, colorData)
        case 'uniform':
            return createUniformColor(props, colorData)
    }
}

export function createSizes(group: Unit.SymmetryGroup, vertexMap: VertexMap, props: SizeTheme) {
    switch (props.name) {
        case 'uniform':
            return createUniformSize(props)
        case 'vdw':
            return elementSizeData({ group, vertexMap })
    }
}