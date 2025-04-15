import React, { startTransition, useEffect, useState } from "react";

import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";
import { getFunctionSelector, isValidAddress } from "../../../utils/common";
import Navigation from "../../../components/Navigation";
import { useDaoContext } from "../../../contexts/DaoContext";
import { useWeb3Context } from "../../../contexts/Web3Context";
import { useStakingContext } from "../../../contexts/StakingContext";
import { HiMiniPlusCircle, HiMiniMinusCircle } from "react-icons/hi2";
import ProposalStepSlider from "../../../components/ProposalStepSlider";
import { EcosystemParameters } from "../../../utils/ecosystemParameters";
import Tooltip from "../../../components/Tooltip";

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });
interface CreateProposalProps {}

const CreateProposal: React.FC<CreateProposalProps> = ({}) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [discussionUrl, setDiscussionUrl] = useState<string>("");
  const [proposalType, setProposalType] = useState<string>("open");
  
  const [epcValue, setEpcValue] = useState<string>("0");
  const [epcParamRange, setEpcParamRange] = useState<string[]>([]);
  const [epcContractName, setEpcContractName] = useState<string>("Staking");
  const [epcMethodDescription, setEpcMethodDescription] = useState<string>("");
  const [epcMethodName, setEpcMethodName] = useState<string>("Delegator Min. Stake");
  const [epcMethodSetter, setEpcMethodSetter] = useState<string>("Staking:Delegator Min. Stake:setDelegatorMinStake(uint256)");
  
  const [openProposalFields, setOpenProposalFields] = useState<{ target: string; amount: string; }[]>([
    { target: "", amount: "" }
  ]);
  const [contractUpgradeFields, setContractUpgradeFields] = useState<{ contractAddress: string; contractCalldata: string }[]>([
    { contractAddress: "", contractCalldata: "" }
  ]);

  // New state for low majority contract
  const [lowMajorityContractAddress, setLowMajorityContractAddress] = useState<string>("");
  const [lowMajorityContractBalance, setLowMajorityContractBalance] = useState<BigNumber>(BigNumber('0'));
  const [totalRequestedAmount, setTotalRequestedAmount] = useState<BigNumber>(BigNumber('0'));
  const [isLowMajorityEligible, setIsLowMajorityEligible] = useState<boolean>(true);

  useEffect(() => {
    if (epcValue === "0") {
      getEpcContractValue(epcContractName, epcMethodName).then((val) => {
        setEpcValue(val);
        loadEpcData(epcContractName, epcMethodName);
      });
    }

    const lowMajorityAddress = import.meta.env.VITE_APP_LOW_MAJORITY_CONTRACT_ADDRESS || "";
    setLowMajorityContractAddress(lowMajorityAddress);

    // Fetch low majority contract balance
    if (lowMajorityAddress) {
      web3Context.web3.eth.getBalance(lowMajorityAddress)
        .then(balance => {
          setLowMajorityContractBalance(BigNumber(balance).dividedBy(1e18));
        })
        .catch(err => console.error("Error fetching low majority balance:", err));
    }
  }, []);

  useEffect(() => {
    if (epcMethodName === "Create proposal fee") {
      setEpcMethodDescription("Fee required to create a governance proposal.");
    } else if (epcMethodName === "Delegator Min. Stake") {
      setEpcMethodDescription("Minimum stake required for a delegator to participate.");
    } else if (epcMethodName === "Minimum Gas Price") {
      setEpcMethodDescription("The lowest gas price allowed for transactions.");
    } else if (epcMethodName === "Block Gas Limit") {
      setEpcMethodDescription("Maximum gas allowed per block.");
    } else if (epcMethodName === "Governance Pot Share Nominator") {
      setEpcMethodDescription("The portion of the governance pot allocated to rewards.");
    } else if (epcMethodName === "Report Disallow Period") {
      setEpcMethodDescription("Timeframe during which a node announces maintenance to avoid penalties.");
    }
  }, [epcMethodName]);

  // Calculate total requested amount and check if eligible for low majority
  useEffect(() => {
    let total = BigNumber(0);
    openProposalFields.forEach(field => {
      if (field.amount && !isNaN(Number(field.amount))) {
        total = total.plus(BigNumber(field.amount));
      }
    });
    
    setTotalRequestedAmount(total);
    setIsLowMajorityEligible(total.isLessThanOrEqualTo(lowMajorityContractBalance));
  }, [openProposalFields, lowMajorityContractBalance]);

  const handleAddOpenProposalField = () => {
    setOpenProposalFields([...openProposalFields, { target: "", amount: "" }]);
  }

  const handleRemoveOpenProposalField = (index: number) => {
    // Don't remove the only field in Low Majority Fill mode
    if (proposalType === "low-majority-fill" && openProposalFields.length <= 1) {
      return;
    }
    
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

  const switchToLowMajorityFill = () => {
    setProposalType("low-majority-fill");
    // Pre-fill with low majority contract address and clear any additional transactions
    setOpenProposalFields([{ target: lowMajorityContractAddress, amount: "" }]);
  }

  const getContractByName = (name: string) => {
    switch (name) {
      case "DAO":
        return web3Context.contractsManager.daoContract;
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
        return web3Context.contractsManager.stContract;
    }
  };
  
  const createProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let targets: string[] = [];
    let values: string[] = [];
    let calldatas: string[] = [];

    try {
      if (proposalType === 'open' || proposalType === 'low-majority-fill') {
        if (!openProposalFields.some(item => item.target !== "" || item.amount !== "")) {
          targets = ['0x0000000000000000000000000000000000000000'];
          values = ["0"];
          calldatas = ["0x"];
        } else {
          targets = openProposalFields.map((field, i) => {
            if (!isValidAddress(field.target)) throw new Error(`Invalid Transaction ${i+1} payout address`);
            else return field.target;
          });
          values = openProposalFields.map((field, i) => {
            if (!field.amount || !(Number(field.amount) >= 0)) throw new Error(`Invalid Transaction ${i+1} payout amount`);
            else return BigNumber(field.amount).multipliedBy(10**18).toString();
          });
          calldatas = openProposalFields.map((field) => {
            return '0x'
          });
        }
      } else if (proposalType === 'contract-upgrade') {
          targets = contractUpgradeFields.map((field, i) => {
            if (!isValidAddress(field.contractAddress)) throw new Error(`Invalid Transaction ${i+1} Contract Address`);
            else return field.contractAddress;
          });
          values = targets.map(() => "0");

          // There is no way to verify without abi if the calldata is valid
          // hence we just check if it is not empty
          calldatas = contractUpgradeFields.map((field, i) => {
            let calldata = field.contractCalldata;
            if (!calldata || calldata.trim().length === 0 || calldata === "0x" || calldata === "0" || calldata === "0x0") {
              throw new Error(`Invalid Transaction ${i + 1} Contract Calldata`);
            }
            return calldata;
          });         
      } else if (proposalType === 'ecosystem-parameter-change') {
        let encodedCallData = "0x";
        const [contractName, methodName, methodSetter] = epcMethodSetter.split(":");

        const epcContractVal = await getEpcContractValue(contractName, methodName);
        if (new BigNumber(epcValue).isEqualTo(epcContractVal)) return toast.warn("Cannot propose the same value");

        if (["Staking", "Block Reward", "Connectivity Tracker"].includes(epcContractName)
        && new BigNumber(epcValue).isNaN()) throw new Error(`Invalid ${methodSetter} value`);

        const contract = getContractByName(epcContractName);
        const contractAddress = contract?.options.address;
        encodedCallData = (contract?.methods as any)[methodSetter](epcValue).encodeABI();

        targets = [contractAddress as string];
        values = ["0"];
        calldatas = [encodedCallData as string];
      }
    } catch(err: any) {
      return toast.error(err.message);
    }

    await daoContext.createProposal(proposalType, title, discussionUrl, targets, values, calldatas, description)
    .then((proposalId) => {
      daoContext.getActiveProposals().then(async () => {
        if (proposalId) {
          const proposalDetails = await daoContext.getProposalDetails(proposalId);
          daoContext.setProposalsState([proposalDetails]);
        }
      });
      startTransition(() => {navigate('/dao')});
    }).catch((err) => {});
  }

  const getEpcContractValue = async (contractName: string, methodName: string) => {
    const contract = getContractByName(contractName);

    try {
      if (contract) {
        return await (contract?.methods as any)[EcosystemParameters[contractName][methodName].getter]().call();
      } else {
        return '0';
      }
    } catch(err) {
      return '0';
    }
  }

  const loadEpcData = async (contractName: string, methodName: string) => {
    try {
      const contract = getContractByName(contractName);
      const parameterData = await (contract?.methods as any)['getAllowedParamsRange'](EcosystemParameters[contractName][methodName].setter).call();
      setEpcParamRange(parameterData.range.length ? parameterData.range : ['0', '0']);
    } catch(err) {
      console.log(err)
    }
  }

  return (
    <section className="section">
      <div className={styles.sectionContainer + " sectionContainer"}>
        <Navigation start="/dao" />

        <span className={styles.createDaoHeading}>Create a Proposal</span>

        <div className={styles.proposalTypeContainer}>
          <label htmlFor="proposalType">Please choose a proposal type you want to create:</label>
          <select 
            className={styles.proposalType} 
            name="proposalType" 
            id="proposalType" 
            value={proposalType} 
            onChange={(e) => {
              const newType = e.target.value;
              setProposalType(newType);
              
              // Reset fields based on the selected proposal type
              if (newType === "low-majority-fill") {
                setOpenProposalFields([{ target: lowMajorityContractAddress, amount: "" }]);
              } else if (newType === "open" && proposalType === "low-majority-fill") {
                // When switching from low-majority-fill to open, reset to an empty field
                setOpenProposalFields([{ target: "", amount: "" }]);
              }
            }}
          >
            <option value="open">Open Proposal</option>
            <option value="contract-upgrade">Contract upgrade</option>
            {lowMajorityContractAddress && <option value="low-majority-fill">Low Majority Balance Fill</option>}
            <option value="ecosystem-parameter-change">Ecosystem parameter change</option>
          </select>
        </div>

        <form className={styles.propsalForm} onSubmit={createProposal}>

          {
            daoContext.notEnoughGovernanceFunds && (
              <p className={styles.warningText}>
                Warning: The total funding requested by active proposals exceeds the available balance in the governance pot. Please create and vote carefully to ensure optimal fund allocation.
              </p>
            )
          }

          <input type="text" className={styles.formInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Proposal Title" required/>
          <input type="text" className={styles.formInput} value={description} onChange={e => setDescription(e.target.value)} placeholder="Proposal Description" required/>
          <input type="text" className={styles.formInput} value={discussionUrl} onChange={e => setDiscussionUrl(e.target.value)} placeholder="Discussion URL (optional)"/>

          {(proposalType === "open" || proposalType === "low-majority-fill") && (
            <>
              <div className={styles.balanceInfoContainer}>
                <div className={styles.balanceInfo}>
                  <h4>Available Balances:</h4>
                  <p><strong>Governance Pot Balance:</strong> {daoContext.governancePotBalance.toFixed(4)} DMD</p>
                  <p><strong>Low Majority Contract Balance:</strong> {lowMajorityContractBalance.toFixed(4)} DMD</p>
                </div>
                
                {proposalType === "open" && lowMajorityContractAddress && (
                  <div className={styles.infoBox}>
                    <p>
                      {isLowMajorityEligible ? (
                        <>Your requested amount is within the <strong>Low Majority</strong> Contract balance. This requires ⅓ participation of the total DAO voting weight and at least ⅓ exceeding Yes votes to pass.</>
                      ) : (
                        <>Your requested amount exceeds the <strong>Low Majority</strong> Contract balance. This proposal must meet a higher threshold of ½ participation and at least ½ exceeding Yes votes to pass.</>
                      )}
                    </p>
                    {isLowMajorityEligible && (
                      <button 
                        type="button"
                        className={styles.switchButton}
                        onClick={switchToLowMajorityFill}
                      >
                        Switch to Low Majority Fill Proposal
                      </button>
                    )}
                  </div>
                )}
                
                {proposalType === "low-majority-fill" && (
                  <div className={styles.infoBox}>
                    <p>
                      This proposal sends funds to the Low Majority Contract, enabling future proposals within its balance to pass with the lower voting threshold (⅓ participation, ⅓ exceeding Yes votes). It requires ½ participation and at least ½ exceeding Yes votes to pass.
                    </p>
                  </div>
                )}
              </div>

              {
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
                      placeholder="Payout Address (optional)"
                      className={styles.formInput}
                      disabled={proposalType === "low-majority-fill" && index === 0}
                    />
                    <input
                      type="text"
                      value={field.amount}
                      onChange={(e) => handleOpenProposalFieldInputChange(index, "amount", e.target.value)}
                      placeholder="Payout Amount in DMD (optional)"
                      className={styles.formInput}
                    />
                  </div>
                ))
              }
            </>
          )}

          {/* Only show Add Transaction button for Open proposals, not for Low Majority Fill */}
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
              <>
              <p>
                  Each parameter from the list can be changed only once a month. If there are multiple proposals to change the same parameter, all with enough "yes" votes and participation during the DAO phase, the community will decide which proposal will be finalized and executed.
              </p>

                <div>
                  <div className={styles.epcSelectContainer}>
                    <select className={styles.epcSelect} name="epcContractName" id="epcContractName" value={epcMethodSetter} onChange={async (e) => {
                      const [contractName, methodName, methodSetter] = e.target.value.split(":");
                      const epcContractVal = await getEpcContractValue(contractName, methodName);
                      setEpcValue(epcContractVal);
                      setEpcMethodSetter(`${contractName}:${methodName}:${methodSetter}`)
                      setEpcMethodName(methodName);
                      setEpcContractName(contractName);
                      loadEpcData(contractName, methodName);
                    }}>
                      {Object.keys(EcosystemParameters).map((contractName) => {
                        return (
                          <optgroup key={contractName} label={contractName}>
                            {Object.keys(EcosystemParameters[contractName]).map((methodName: any) => {
                              const methodSetter = EcosystemParameters[contractName][methodName].setter;
                              return <option key={methodSetter} value={`${contractName}:${methodName}:${methodSetter}`}>{methodName}</option>;
                            })}
                          </optgroup>
                        );
                      })}
                    </select>

                    <Tooltip text={epcMethodDescription} />
                  </div>

                  <ProposalStepSlider parameterName={epcMethodName} paramsRange={epcParamRange} state={epcValue} setState={setEpcValue} />
                </div>
              </>
            )
          }

          <p>
            Please note that you pay a proposal fee and a service fee when you submit a new voting creation. You can dismiss the proposal during the proposal phase, but you will lose your funds. If your proposal is accepted, the proposal fee is returned to you on the proposal finalization.
          </p>

          <button>Create</button>
        </form>
      </div>
    </section>
  );
};

export default CreateProposal;
