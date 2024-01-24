import { atom } from "recoil";
import { Pool } from "../contexts/StakingContext/models/model";

// Atom definition
export const poolAtom = (stakingAddress: string) => {
  return atom({
    key: `poolAtom-${stakingAddress}`,
    default: new Pool(stakingAddress),
  });
};
