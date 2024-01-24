import { atom } from 'recoil';
import { Delegator } from '../contexts/StakingContext/models/model';

export const delegatorAtom = atom<Delegator>({
    key: 'delegatorAtom',
    default: undefined,
});