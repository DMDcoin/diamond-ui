import { atom, selector } from "recoil";
import { Context } from "../contexts/StakingContext/models/context";

// Atom for Context
const contextAtom = atom<Context>({
  key: "contextAtom",
  default: new Context(),
});

// Atom Selectors
const epochStartTimeFormattedSelector = selector({
  key: "epochStartTimeFormattedSelector",
  get: ({ get }) => {
    const context = get(contextAtom);
    return context.epochStartTimeFormatted;
  },
});

const minimumGasFeeFormattedSelector = selector({
  key: "minimumGasFeeFormattedSelector",
  get: ({ get }) => {
    const context = get(contextAtom);
    return context.minimumGasFeeFormatted;
  },
});

module.exports = {
  contextAtom,
  epochStartTimeFormattedSelector,
  minimumGasFeeFormattedSelector,
};
