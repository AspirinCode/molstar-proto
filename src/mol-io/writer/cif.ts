/**
 * Copyright (c) 2017 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import TextEncoder from './cif/encoder/text'
import BinaryEncoder, { EncodingProvider } from './cif/encoder/binary'
import * as _Encoder from './cif/encoder'
import { ArrayEncoding, ArrayEncoder } from '../common/binary-cif';
import { CifFrame } from '../reader/cif';

export namespace CifWriter {
    export import Encoder = _Encoder.Encoder
    export import Category = _Encoder.Category
    export import Field = _Encoder.Field
    export import Encoding = ArrayEncoding

    export interface EncoderParams {
        binary?: boolean,
        encoderName?: string,
        binaryEncodingPovider?: EncodingProvider,
        binaryAutoClassifyEncoding?: boolean
    }

    export function createEncoder(params?: EncoderParams): Encoder {
        const { binary = false, encoderName = 'mol*' } = params || {};
        return binary ? new BinaryEncoder(encoderName, params ? params.binaryEncodingPovider : void 0, params ? !!params.binaryAutoClassifyEncoding : false) : new TextEncoder();
    }

    export function fields<K = number, D = any>() {
        return Field.build<K, D>();
    }

    import E = Encoding
    export const Encodings = {
        deltaRLE: E.by(E.delta).and(E.runLength).and(E.integerPacking),
        fixedPoint2: E.by(E.fixedPoint(100)).and(E.delta).and(E.integerPacking),
        fixedPoint3: E.by(E.fixedPoint(1000)).and(E.delta).and(E.integerPacking),
    };

    export function categoryInstance<Key, Data>(fields: Field<Key, Data>[], source: Category.DataSource): Category.Instance {
        return { fields, source: [source] };
    }

    export function createEncodingProviderFromCifFrame(frame: CifFrame): EncodingProvider {
        return {
            get(c, f) {
                const cat = frame.categories[c];
                if (!cat) return void 0;
                const ff = cat.getField(f);
                return ff && ff.binaryEncoding ? ArrayEncoder.fromEncoding(ff.binaryEncoding) : void 0;
            }
        }
    }
}