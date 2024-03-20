import React, { startTransition, useEffect, useState } from "react";

import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { isValidAddress } from "../../../utils/common";
import Navigation from "../../../components/Navigation";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { HiMiniPlusCircle, HiMiniMinusCircle } from "react-icons/hi2";
import ProposalStepSlider from "../../../components/ProposalStepSlider";
import { EcosystemParameters } from "../../../utils/ecosystemParameters";

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });
interface CreateProposalProps {}

const CreateProposal: React.FC<CreateProposalProps> = ({}) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [proposalType, setProposalType] = useState<string>("open");
  
  const [epcValue, setEpcValue] = useState<string>("0");
  const [epcType, setEpcType] = useState<string>("Staking");
  const [epcOption, setEpcOption] = useState<string>("setDelegatorMinStake");
  const [epcParameter, setEpcParameter] = useState<string>("Delegator Min. Stake");
  const [epcData, setEpcData] = useState<{ min: string, max: string, step: string, stepOperation: string }>({min: "0", max: "0", step: "0", stepOperation: "add"});
  const [openProposalFields, setOpenProposalFields] = useState<{ target: string; amount: string; txText: string }[]>([
    { target: "", amount: "", txText: "" }
  ]);
  const [contractUpgradeFields, setContractUpgradeFields] = useState<{ contractAddress: string; contractCalldata: string }[]>([
    { contractAddress: "", contractCalldata: "" }
  ]);

  useEffect(() => {
    if (epcValue === "0") {
      getEpcContractValue(epcType, epcParameter).then((val) => {
        setEpcValue(val);
        loadEpcData(epcType, epcParameter);
      });
    }
  });

  const handleAddOpenProposalField = () => {
    setOpenProposalFields([...openProposalFields, { target: "", amount: "", txText: "" }]);
  }

  const handleRemoveOpenProposalField = (index: number) => {
    const newFields = [...openProposalFields];
    newFields.splice(index, 1);
    setOpenProposalFields(newFields);
  }

  const handleOpenProposalFieldInputChange = (index: number, fieldName: string, value: string) => {
    const newFields: any = [...openProposalFields];
    newFields[index][fieldName] = value;
    setOpenProposalFields(newFields);
  }

  const handleAddContractCallProposalField = () => {
    setContractUpgradeFields([...contractUpgradeFields, { contractAddress: "", contractCalldata: "" }]);
  }

  const handleRemoveContractCallProposalField = (index: number) => {
    const newFields = [...contractUpgradeFields];
    newFields.splice(index, 1);
    setContractUpgradeFields(newFields);
  }

  const handleContractCallProposalFieldInputChange = (index: number, fieldName: string, value: string) => {
    const newFields: any = [...contractUpgradeFields];
    newFields[index][fieldName] = value;
    setContractUpgradeFields(newFields);
  }

  const getContractByType = async (type: string) => {
    switch (type) {
      case "Staking":
        return web3Context.contractsManager.stContract;
      case "Certifier":
        return web3Context.contractsManager.crContract;
      case "Validator":
        return web3Context.contractsManager.vsContract;
      case "Tx Permission":
        return web3Context.contractsManager.tpContract;
      case "Block Reward":
        return web3Context.contractsManager.brContract;
      case "Connectivity Tracker":
        return web3Context.contractsManager.ctContract;
      default:
        return null;
    }
  };
  
  const createProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let targets: string[] = [];
    let values: string[] = [];
    let calldatas: string[] = [];

    try {
      if (proposalType === 'open') {
        targets = openProposalFields.map((field, i) => {
          if (!isValidAddress(field.target)) throw new Error(`Invalid Transaction ${i+1} payout address`);
          else return field.target;
        });
        values = openProposalFields.map((field, i) => {        
          if (!(Number(field.amount) >= 0)) throw new Error(`Invalid Transaction ${i+1} payout amount`);
          else return field.amount;
        });
        calldatas = openProposalFields.map((field) => {
          return (field.txText ? web3Context.web3.utils.encodePacked(field.txText) : '') as string;
        });
      } else if (proposalType === 'contract-upgrade') {
          targets = contractUpgradeFields.map((field, i) => {
            if (!isValidAddress(field.contractAddress)) throw new Error(`Invalid Transaction ${i+1} Contract Address`);
            else return field.contractAddress;
          });
          values = targets.map(() => "0");
          calldatas = contractUpgradeFields.map((field, i) => {
            return field.contractCalldata;
          });          
      } else if (proposalType === 'ecosystem-parameter-change') {
        let encodedCallData;
        let contractAddress;

        if (["Staking", "Block Reward", "Connectivity Tracker"].includes(epcType)
        && new BigNumber(epcValue).isNaN()) throw new Error(`Invalid ${epcOption} value`);

        const contract = await getContractByType(epcType);
        contractAddress = contract?.options.address;

        if (["Certifier", "Tx Permission"].includes(epcType)) {
          if (epcOption === 'addAllowedSender' || epcOption === 'removeAllowedSender') {
            if (!isValidAddress(epcValue)) throw new Error(`Invalid ${epcOption} address`);
          }
          encodedCallData = (contract?.methods as any)[epcOption](epcValue).encodeABI();
        } else if (["Staking", "Validator", "Block Reward", "Connectivity Tracker"].includes(epcType)) {
          encodedCallData = (contract?.methods as any)[epcOption](new BigNumber(epcValue)).encodeABI();
        }

        targets = [contractAddress as string];
        values = ["0"];
        calldatas = [encodedCallData as string];
      }

      const proposalId = await daoContext.createProposal(proposalType, title, targets, values, calldatas, description);
      daoContext.getActiveProposals().then(async () => {
        if (proposalId) {
          const proposalDetails = await daoContext.getProposalDetails(proposalId);
          daoContext.setProposalsState([proposalDetails]);
        }
      });
      startTransition(() => {navigate('/dao')});
    } catch(err: any) {
      if (err.message && (err.message.includes("MetaMask") || err.message.includes("Transaction") || err.message.includes("Invalid"))) {
        toast.error(err.message);
      }
    }
  }

  const getEpcContractValue = async (type: string, parameter: string) => {
    const parameterData = EcosystemParameters[type][parameter];
    let val: BigNumber = BigNumber('0');
    
    if (parameterData.value)
      return BigNumber(parameterData.value).dividedBy(10**parameterData.decimals).toString();

    const getMethod = parameterData.getter;
    const contract = await getContractByType(type);
    if (contract) {
      val = BigNumber(await (contract.methods as any)[getMethod]().call());
      EcosystemParameters[type][parameter].value = val.toString();
    }
    
    return BigNumber(val).dividedBy(10**parameterData.decimals).toString();
  }

  const loadEpcData = async (type: string, parameter: string) => {
    const parameterData = EcosystemParameters[type][parameter];
    let epcData = {
      min: parameterData.min,
      max: parameterData.max,
      step: parameterData.step,
      stepOperation: parameterData.stepOperation
    }
    setEpcData(epcData);
  }

  return (
    <div className="mainContainer">
      <Navigation start="/dao" />

      <span className={styles.createDaoHeading}>Create a Proposal</span>

      <div className={styles.proposalTypeContainer}>
        <label htmlFor="proposalType">Please choose a proposal type you want to create:</label>
        <select className={styles.proposalType} name="proposalType" id="proposalType" value={proposalType} onChange={(e) => setProposalType(e.target.value)}>
          <option value="open">Open Proposal</option>
          <option value="contract-upgrade">Contract upgrade</option>
          <option value="ecosystem-parameter-change">Ecosystem parameter change</option>
        </select>
      </div>

      <form className={styles.propsalForm} onSubmit={createProposal}>
        <input type="text" className={styles.formInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Proposal Title" required/>
        <input type="text" className={styles.formInput} value={description} onChange={e => setDescription(e.target.value)} placeholder="Proposal Description" required/>

        {proposalType === "open" && (
          openProposalFields.map((field, index) => (
            <div key={index}>
                <span className={styles.addRemoveTransaction} onClick={() => {index !== 0 && handleRemoveOpenProposalField(index)}}>
                Transaction {index + 1}
                  {index !== 0 && (<HiMiniMinusCircle size={20} color="red" />)}
                </span>
              
              <input
                type="text"
                value={field.target}
                onChange={(e) => handleOpenProposalFieldInputChange(index, "target", e.target.value)}
                placeholder="Payout Address"
                className={styles.formInput}
                required
              />
              <input
                type="text"
                value={field.amount}
                onChange={(e) => handleOpenProposalFieldInputChange(index, "amount", e.target.value)}
                placeholder="Payout Amount"
                className={styles.formInput}
                required
              />
              <input
                type="text"
                value={field.txText}
                onChange={(e) => handleOpenProposalFieldInputChange(index, "txText", e.target.value)}
                placeholder="Transaction Text"
                className={styles.formInput}
                required
              />
            </div>
          ))
        )}

        {proposalType === "open" && (
          <span className={styles.addRemoveTransaction} onClick={handleAddOpenProposalField}>
            Add Transaction
            <HiMiniPlusCircle size={20} color="green" />
          </span>
        )}

        {
          proposalType === "contract-upgrade" && (
            contractUpgradeFields.map((field, index) => (
              <div key={index}>
                <span className={styles.addRemoveTransaction} onClick={() => {index !== 0 && handleRemoveContractCallProposalField(index)}}>
                  Transaction {index + 1}
                  {index !== 0 && (<HiMiniMinusCircle size={20} color="red" />)}
                </span>

                <input
                  type="text"
                  value={field.contractAddress}
                  onChange={(e) => handleContractCallProposalFieldInputChange(index, "contractAddress", e.target.value)}
                  placeholder="Contract Address"
                  className={styles.formInput}
                  required
                />
                <input
                  type="text"
                  value={field.contractCalldata}
                  onChange={(e) => handleContractCallProposalFieldInputChange(index, "contractCalldata", e.target.value)}
                  placeholder="Contract Calldata"
                  className={styles.formInput}
                  required
                />
              </div>
            )
          ))
        }

        {proposalType === "contract-upgrade" && (
          <span className={styles.addRemoveTransaction} onClick={handleAddContractCallProposalField}>
            Add Transaction
            <HiMiniPlusCircle size={20} color="green" />
          </span>
        )}

        {
          proposalType === "ecosystem-parameter-change" && (
            <div>
              <input type="text" className={styles.formInput} placeholder="Discussion Link" />
              <select className={styles.epcType} name="epcType" id="epcType" value={epcOption} onChange={async (e) => {
                const [type, parameter, value] = e.target.value.split(":");
                const epcContractVal = await getEpcContractValue(type, parameter);
                setEpcValue(epcContractVal);
                setEpcOption(`${type}:${parameter}:${value}`)
                setEpcType(type);
                loadEpcData(type, parameter);
              }}>
                {Object.keys(EcosystemParameters).map((category) => {
                  return (
                    <optgroup key={category} label={category}>
                      {Object.keys(EcosystemParameters[category]).map((parameter: any) => {
                        const value = EcosystemParameters[category][parameter].setter;
                        return <option key={value} value={`${category}:${parameter}:${value}`}>{parameter}</option>;
                      })}
                    </optgroup>
                  );
                })}
              </select>

              <ProposalStepSlider min={epcData.min} max={epcData.max} step={epcData.step} state={epcValue} stepOperation={epcData.stepOperation} setState={setEpcValue} />
            </div>
          )
        }

        <p>
          Please note that you pay a proposal fee when you submit a new voting
          creation. You can dismiss it during 14 days from the creation date
          until the voting starts.
        </p>

        <button>Create</button>
      </form>
    </div>
  );
};

export default CreateProposal;
