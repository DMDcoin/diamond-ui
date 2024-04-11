const Web3 = require("web3");
const JsonDiamonDao = require("./src/contexts/contract-abis/DiamondDao.json");

const web3 = new Web3(
  new Web3.providers.HttpProvider("https://rpc.uniq.diamonds"),
  0,
  1
);
const account = web3.eth.accounts.privateKeyToAccount(
  "f4dd4ae26d58142f59addf6b5e4308e5f38871b230279d130396afc33e5a8973"
);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

async function getDiamondContract() {
  let contractAddress = "0xAfCD1595ceFDc2FE3B4Cba90185497A28A9E2612";

  const abi = JsonDiamonDao.abi;
  const contract = new web3.eth.Contract(abi, contractAddress);
  return contract;
}

const main = async () => {
  const stakingContract = await getDiamondContract();

  const targets = ["0xC969dc0b07acE3e99d6C2636e26D80086a90b847"];
  const values = [0];
  const callDatas = ["0x"];

  for (let i = 0; i < 94; i++) {
    try {
      const description = `Historic Proposal Test ${i + 4}`;
      await stakingContract.methods
        .propose(targets, values, callDatas, description)
        .send({
          from: account.address,
          gas: 8000000,
          value: "1000000000000000000"
        });
      console.log(`Proposal ${i + 4} created`);
    } catch (e) {
      console.log(e);
    }
  }
};

main();
