// import { DataAdapter } from "./dataAdapter";
// import { ContractManager } from "./models/contractManager";

// const initialize = async (url: URL, recoilState: any): Promise<DataAdapter> => {
    
//     console.log('[INFO] Initializing data adapter with:', url.toString());
//     const adapter = new DataAdapter();

//     adapter.recoilState = recoilState;

//     adapter.url = url;
//     adapter.web3 = new Web3(url.toString());
//     adapter.contracts = new ContractManager(adapter.web3);
    
//     adapter.vsContract = adapter.contracts.getValidatorSetHbbft();
//     adapter.stContract = await adapter.contracts.getStakingHbbft();
//     adapter.brContract = await adapter.contracts.getRewardHbbft();
//     adapter.kghContract = await adapter.contracts.getKeyGenHistory();
//     adapter.rngContract = await adapter.contracts.getRandomHbbft();
    
//     adapter.refresh();
//     adapter.updateEventSubscription();

//     return adapter; 
//   }