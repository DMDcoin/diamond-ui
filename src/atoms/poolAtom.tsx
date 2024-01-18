import { atom } from "recoil";
import { Pool } from "../services/blockchain/models/model";

// Atom definition
export const poolAtom = (stakingAddress: string) => {
  return atom({
    key: `poolAtom-${stakingAddress}`,
    default: new Pool(stakingAddress),
  });
};
