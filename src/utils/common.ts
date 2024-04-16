const Web3 = require('web3');
const web3 = new Web3();

export const isValidAddress = (address: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

export const getFunctionSelector = (signature: string): string => {
  return web3.utils.sha3(signature).slice(0, 10);
};

export const getFunctionName = (abi: any[], selector: string): string => {
  const matchingFunction = abi.find(item => {
      if (item.type === 'function') {
          const functionSignature = `${item.name}(${item.inputs.map((input: any) => input.type).join(',')})`;
          const calculatedSelector = web3.utils.sha3(functionSignature).slice(0, 10);
          return calculatedSelector === selector;
      }
      return false;
  });
  return matchingFunction ? `${matchingFunction.name}(${matchingFunction.inputs.map((input: any) => input.type).join(',')})` : 'Unknown function';
};