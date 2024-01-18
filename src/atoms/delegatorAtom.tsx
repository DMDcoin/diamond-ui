import { atom } from 'recoil';
import { Delegator } from '../services/blockchain/models/model';

export const delegatorAtom = atom<Delegator>({
    key: 'delegatorAtom',
    default: undefined,
});