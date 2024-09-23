import BigNumber from "bignumber.js";

const Web3 = require('web3');
const web3 = new Web3();
const { toBuffer, bufferToHex, ecrecover, publicToAddress, hashPersonalMessage, fromRpcSig } = require('ethereumjs-util');


export const isValidAddress = (address: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

export const getFunctionSelector = (signature: string): string => {
  return web3.utils.sha3(signature).slice(0, 10);
};

export const extractValueFromCalldata = (calldata: string): string => {
  const encodedValue = calldata.slice(10, 74);
  
  // Decode the value as a uint256
  const value = web3.utils.hexToNumberString(`0x${encodedValue}`);
  
  return value;
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

export const timestampToDate = (timestamp: string) => {
  const date = new Date(Number(timestamp) * 1000);
  const month = date.toLocaleString('default', { month: 'short' }); // Get short month name
  const day = date.getDate();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export const timestampToDateTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const month = date.toLocaleString('default', { month: 'short' }); // Get short month name
  const day = date.getDate();
  const year = date.getFullYear();
  
  // Get hours, minutes, and seconds and pad with leading zeros if needed
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
}

export const getAddressFromPublicKey = (publicKey: string): string => {
  let publicKeyCleaned = publicKey;

  if (publicKey.startsWith("0x")) {
    publicKeyCleaned = publicKey.substring(2);
  }

  const resultBuffer = publicToAddress(
    Buffer.from(publicKeyCleaned, "hex"),
    true
  );

  return `0x${resultBuffer.toString("hex")}`;
}

export const requestPublicKeyMetamask = async (web3: any, address: string) => {
  // Sign a message
  const message = 'MetaMask public key retrieval';
  const messageHex = bufferToHex(Buffer.from(message, 'utf8'));
  const signature = await web3.eth.personal.sign(message, address);

  // Hash the message
  const messageHash = hashPersonalMessage(toBuffer(messageHex));

  // Extract signature parameters
  const { v, r, s } = fromRpcSig(signature);

  // Recover the public key
  const publicKey = ecrecover(messageHash, v, r, s);
  const publicKeyHex = bufferToHex(publicKey);
  const derivedAddress = bufferToHex(publicToAddress(publicKey));

  console.log(`Address: ${address}`);
  console.log(`Derived Address: ${derivedAddress}`);
  console.log(`Public Key: ${publicKeyHex}`);

  return publicKeyHex;
}

/**
 * Determines the number of decimal places to interpret the value as.
 * Assumes different units based on the length of the value.
 * @param {string|number} value - The value to check.
 * @returns {number} - The number of decimal places.
 */
export const getDecimalsBasedOnUnitLength = (value: string | number): number => {
  // Convert to string if it's a number
  if (typeof value === 'number') {
    value = value.toString();
  }

  // Remove any leading zeros
  value = value.replace(/^0+/, '');

  const strLength = value.length;

  // Interpret based on the number of trailing zeros
  if (strLength >= 18) {
    return 18;
  } else if (strLength >= 9) {
    return 9;
  } else {
    return 1;
  }
}

/**
 * Determines the unit name based on the length of the value.
 * Assumes different units like Wei, Gwei, and DMD.
 * @param {string|number} value - The value to check.
 * @returns {string} - The unit name (Wei, Gwei, or DMD).
 */
export const getCryptoUnitName = (value: string | number): string => {
  // Convert to string if it's a number
  if (typeof value === 'number') {
    value = value.toString();
  }

  // Remove any leading zeros
  value = value.replace(/^0+/, '');

  const strLength = value.length;

  // Interpret based on the number of trailing zeros
  if (strLength >= 18) {
    return "DMD";
  } else if (strLength >= 9) {
    return "Gwei";
  } else {
    return "Wei";
  }
}

/**
 * Converts a value to its corresponding unit and returns a string representation.
 * Assumes different units based on the length of the value and formats it accordingly.
 * @param {string|number} value - The value to convert.
 * @returns {string} - The value formatted with its unit (Wei, Gwei, or DMD).
 */
export const formatCryptoUnitValue = (value: string | number): string => {
  // Convert to string if it's a number
  if (typeof value === 'number') {
    value = value.toString();
  }

  // Remove any leading zeros
  value = value.replace(/^0+/, '');

  const strLength = value.length;

  // Interpret based on the number of trailing zeros
  if (strLength >= 18) {
    return `${BigNumber(value).dividedBy(10**18)} DMD`;
  } else if (strLength >= 9) {
    return `${BigNumber(value).dividedBy(10**9)} Gwei`;
  } else {
    return `${BigNumber(value).dividedBy(10**1)} Wei`;
  }
}