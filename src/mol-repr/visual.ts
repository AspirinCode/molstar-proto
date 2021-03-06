/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { RuntimeContext } from 'mol-task'
import { GraphicsRenderObject } from 'mol-gl/render-object'
import { PickingId } from '../mol-geo/geometry/picking';
import { Loci } from 'mol-model/loci';
import { MarkerAction } from '../mol-geo/geometry/marker-data';
import { ParamDefinition as PD } from 'mol-util/param-definition';
import { WebGLContext } from 'mol-gl/webgl/context';
import { Theme } from 'mol-theme/theme';
import { Mat4 } from 'mol-math/linear-algebra';
import { setTransformData } from 'mol-geo/geometry/transform-data';
import { calculateTransformBoundingSphere } from 'mol-gl/renderable/util';
import { ValueCell } from 'mol-util';

export interface VisualContext {
    readonly runtime: RuntimeContext
    readonly webgl?: WebGLContext
}
// export type VisualFactory<D, P extends PD.Params> = (ctx: VisualContext) => Visual<D, P>

export { Visual }
interface Visual<D, P extends PD.Params> {
    /** Number of addressable groups in all instances of the visual */
    readonly groupCount: number
    readonly renderObject: GraphicsRenderObject | undefined
    createOrUpdate: (ctx: VisualContext, theme: Theme, props?: Partial<PD.Values<P>>, data?: D) => Promise<void> | void
    getLoci: (pickingId: PickingId) => Loci
    mark: (loci: Loci, action: MarkerAction) => boolean
    setVisibility: (value: boolean) => void
    setPickable: (value: boolean) => void
    setTransform: (value: Mat4) => void
    destroy: () => void
}
namespace Visual {
    export function setVisibility(renderObject: GraphicsRenderObject | undefined, value: boolean) {
        if (renderObject) renderObject.state.visible = value
    }

    export function setPickable(renderObject: GraphicsRenderObject | undefined, value: boolean) {
        if (renderObject) renderObject.state.pickable = value
    }

    export function setTransform(renderObject: GraphicsRenderObject | undefined, value: Mat4) {
        if (renderObject) {
            const { values } = renderObject
            setTransformData(value, values)
            const boundingSphere = calculateTransformBoundingSphere(values.invariantBoundingSphere.ref.value, values.aTransform.ref.value, values.instanceCount.ref.value)
            ValueCell.update(values.boundingSphere, boundingSphere)
        }
    }
}