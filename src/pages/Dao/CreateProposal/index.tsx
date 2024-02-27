import React, { startTransition, useEffect, useState } from "react";

import styles from "./createproposal.module.css";

import { useNavigate } from "react-router-dom";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";

import Navigation from "../../../components/Navigation";
import RangeSlider from "../../../components/RangeSlider";
import { HiMiniPlusCircle, HiMiniMinusCircle } from "react-icons/hi2";
import { toast } from "react-toastify";

interface CreateProposalProps {}

interface ParameterAction {
  [key: string]: string;
}

interface EcosystemParameters {
  [key: string]: ParameterAction[];
}

const EcosystemParameters: EcosystemParameters = {
  "Staking": [
    {'Delegator Min. Stake': 'setDelegatorMinStake'},
    {'Candidate Min. Stake': 'setCandidateMinStake'},
    {'Staking Transition Timeframe Length': 'setStakingTransitionTimeframeLength'},
    {'Staking Fixed Epoch Duration': 'setStakingFixedEpochDuration'}
  ],
  "Certifier": [
    {'Add as certified': 'certify'},
    {'Remove Certified': 'revoke'}
  ],
  "Validator": [
    {'Validator Inacticity Threshold': 'setValidatorInactivityThreshold'},
    {'Max Validators': 'setMaxValidators'},
    {'Ban Duration': 'setBanDuration'}
  ],
  "Tx Permission": [
    {'Minimum Gas Price': 'setMinimumGasPrice'},
    {'Block Gas Limit': 'setBlockGasLimit'},
    {'Add Allowed Sender': 'addAllowedSender'},
    {'Remove Allowed Sender': 'removeAllowedSender'}
  ],
  "Block Reward": [
    {"Delta Pot Payout Fraction": 'setdeltaPotPayoutFraction'},
    {'Reinsert Pot Payout Fraction': 'setReinsertPotPayoutFraction'}
  ],
  "Connectivity Tracker": [
    {'Min. Report Age Blocks': 'setMinReportAge'},
    {'Early Epoch End Tolerance Level': 'setEarlyEpochEndToleranceLevel'}
  ]
}

const CreateProposal: React.FC<CreateProposalProps> = ({}) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [proposalType, setProposalType] = useState<string>("open");

  const [epcValue, setEpcValue] = useState<string>("");
  const [epcType, setEpcType] = useState<string>("gas-price-value");
  const [openProposalFields, setOpenProposalFields] = useState<{ target: string; amount: string; txText: string }[]>([
    { target: "", amount: "", txText: "" }
  ]);
  const [contractUpgradeFields, setContractUpgradeFields] = useState<{ contractAddress: string; contractCalldata: string }[]>([
    { contractAddress: "", contractCalldata: "" }
  ]);

  useEffect(() => {
    if (!daoContext.daoInitialized) {
      daoContext.initialize().then(() => {
        daoContext.getActiveProposals();
      });
    }
  }, [daoContext.activeProposals]);

  const isValidAddress = (address: string): boolean => {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  };

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

  const createProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (proposalType === 'open') {
        const targets = openProposalFields.map((field, i) => {
          if (!isValidAddress(field.target)) throw new Error(`Invalid Transaction ${i+1} payout address`);
          else return field.target;
        });
        const values = openProposalFields.map((field, i) => {        
          if (!Number(field.amount)) throw new Error(`Invalid Transaction ${i+1} payout amount`);
          else return field.amount;
        });
        const texts = openProposalFields.map((field) => {
          return (field.txText ? web3Context.web3.utils.encodePacked(field.txText) : '') as string;
        });

        await daoContext.createProposal(proposalType, title, targets, values, texts, description);
        daoContext.getActiveProposals();
        startTransition(() => {navigate('/dao')});
        
      } else if (proposalType === 'contract-upgrade') {
          const addresses = contractUpgradeFields.map((field, i) => {
            if (!isValidAddress(field.contractAddress)) throw new Error(`Invalid Transaction ${i+1} Contract Address`);
            else return field.contractAddress;
          });
          const values = addresses.map(() => "0");
          const calldatas = contractUpgradeFields.map((field, i) => {
            return field.contractCalldata;
          });

          await daoContext.createProposal(proposalType, title, addresses, values, calldatas, description);
          daoContext.getActiveProposals();
          startTransition(() => {navigate('/dao')});
      } else if (proposalType === 'ecosystem-parameter-change') {

      }
    } catch(err: any) {
      if (err.message.includes("MetaMask") || err.message.includes("Transaction")) {
        toast.error(err.message);
      } else {
        toast.error("Proposal creation failed. Please try again.");
      }
    }
  }

  return (
    <div className="mainContainer">
      <Navigation start="/dao" />

      <span className={styles.createDaoHeading}>Create a Proposal</span>

      <div className={styles.proposalTypeContainer}>
        <label htmlFor="proposalType">Please choose a proposal type you want to create:</label>
        <select className={styles.proposalType}    name="proposalType" id="proposalType" value={proposalType} onChange={(e) => setProposalType(e.target.value)}>
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
          )
          )
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
              <select className={styles.epcType} name="epcType" id="epcType" value={epcType} onChange={(e) => setEpcType(e.target.value)}>
                {Object.keys(EcosystemParameters).map((category) => {
                  return (
                    <optgroup key={category} label={category}>
                      {EcosystemParameters[category].map((parameter: any) => {
                        const key = Object.keys(parameter)[0];
                        const value = parameter[key];
                        return <option key={value} value={value}>{key}</option>;
                      })}
                    </optgroup>
                  );
                })}
              </select>
              
              <input type="text" className={styles.formInput} placeholder="Enter value" value={epcValue} onChange={e => setEpcValue(e.target.value)}/>
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
