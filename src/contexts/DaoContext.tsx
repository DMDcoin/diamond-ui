import React, { createContext, useContext } from "react";
import { ContextProviderProps } from "./types";

interface DaoContextProps {}
const DaoContext = createContext<DaoContextProps | undefined>(undefined);

const DaoContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const contextValue = {};

  return (
    <DaoContext.Provider value={contextValue}>{children}</DaoContext.Provider>
  );
};

const useDaoContext = (): DaoContextProps => {
  const context = useContext(DaoContext);

  if (context === undefined) {
    throw new Error("Coudln't fetch DAO Context");
  }

  return context;
};

export { DaoContextProvider, useDaoContext };
