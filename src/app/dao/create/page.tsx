"use client";

import React, { startTransition, useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import { toast } from "react-toastify";
import styles from "./Create.module.css";
import { useRouter } from "next/navigation";
import { isValidAddress } from "@/utils/common";
import { formatDmd } from "@/utils/format";
import InfoTooltip from "@/components/InfoTooltip";
import { useDaoContext } from "@/contexts/DAO";
import logger from '@/utils/logger';
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import ProposalStepSlider from "@/components/ProposalStepSlider";
import { EcosystemParameters } from "@/utils/ecosystemParameters";
import { normalizeDmdNameInput, stripDmdSuffix, validateDmdName } from "@/utils/dmdNaming";

const USERNAME_MODERATION_REASONS = [
  { value: "offensive-abusive", label: "Offensive / abusive language" },
  { value: "hate-speech", label: "Hate speech or discrimination" },
  { value: "scam-phishing", label: "Scam / phishing impersonation" },
  { value: "brand-impersonation", label: "Brand or identity impersonation" },
  { value: "sexual-content", label: "Sexual or explicit content" },
  { value: "illegal-activity", label: "Illegal activity reference" },
  { value: "other", label: "Other" },
];

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

export default function CreateProposalPage() {
  const router = useRouter();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discussionUrl, setDiscussionUrl] = useState("");
  const [proposalType, setProposalType] = useState<string>("open");

  const [epcValue, setEpcValue] = useState<string>("0");
  const [epcParamRange, setEpcParamRange] = useState<string[]>([]);
  const [epcContractName, setEpcContractName] = useState<string>("Staking");
  const [epcMethodDescription, setEpcMethodDescription] = useState<string>("");
  const [epcMethodName, setEpcMethodName] = useState<string>("Delegator Min. Stake");
  const [epcMethodSetter, setEpcMethodSetter] = useState<string>("Staking:Delegator Min. Stake:setDelegatorMinStake(uint256)");

  const [openProposalFields, setOpenProposalFields] = useState<{ target: string; amount: string }[]>([{ target: "", amount: "" }]);
  const [contractUpgradeFields, setContractUpgradeFields] = useState<{ contractAddress: string; contractCalldata: string }[]>([
    { contractAddress: "", contractCalldata: "" },
  ]);

  const [umUsername, setUmUsername] = useState("");
  const [umOwnerAddress, setUmOwnerAddress] = useState("");
  const [umReasonCategory, setUmReasonCategory] = useState("");
  const [umEvidence, setUmEvidence] = useState("");

  const [totalRequestedAmount, setTotalRequestedAmount] = useState<BigNumber>(BigNumber("0"));
  const [isLowMajorityEligible, setIsLowMajorityEligible] = useState<boolean>(true);

  const { lowMajorityContractBalance, lowMajorityContractAddress } = daoContext;

  useEffect(() => {
    if (epcValue === "0" && web3Context.web3Initialized && web3Context.contractsManager) {
      getEpcContractValue(epcContractName, epcMethodName).then((val) => {
        setEpcValue(val);
        loadEpcData(epcContractName, epcMethodName);
      });
    }
  }, [web3Context.web3Initialized, web3Context.contractsManager]);

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
    } else if (epcMethodName === "Minting Fee") {
      setEpcMethodDescription("Fee required to mint/register a new DMD name. Gas fees are paid separately.");
    }
  }, [epcMethodName]);

  useEffect(() => {
    let total = BigNumber(0);
    openProposalFields.forEach((field) => {
      if (field.amount && !isNaN(Number(field.amount))) {
        total = total.plus(BigNumber(field.amount));
      }
    });

    setTotalRequestedAmount(total);
    setIsLowMajorityEligible(total.isLessThanOrEqualTo(lowMajorityContractBalance));
  }, [openProposalFields, lowMajorityContractBalance]);

  const handleAddOpenProposalField = () => {
    setOpenProposalFields([...openProposalFields, { target: "", amount: "" }]);
  };

  const handleRemoveOpenProposalField = (index: number) => {
    if (proposalType === "low-majority-fill" && openProposalFields.length <= 1) {
      return;
    }

    const newFields = [...openProposalFields];
    newFields.splice(index, 1);
    setOpenProposalFields(newFields);
  };

  const handleOpenProposalFieldInputChange = (index: number, fieldName: string, value: string) => {
    const newFields: any = [...openProposalFields];
    newFields[index][fieldName] = value;
    setOpenProposalFields(newFields);
  };

  const handleAddContractCallProposalField = () => {
    setContractUpgradeFields([...contractUpgradeFields, { contractAddress: "", contractCalldata: "" }]);
  };

  const handleRemoveContractCallProposalField = (index: number) => {
    const newFields = [...contractUpgradeFields];
    newFields.splice(index, 1);
    setContractUpgradeFields(newFields);
  };

  const handleContractCallProposalFieldInputChange = (index: number, fieldName: string, value: string) => {
    const newFields: any = [...contractUpgradeFields];
    newFields[index][fieldName] = value;
    setContractUpgradeFields(newFields);
  };

  const switchToLowMajorityFill = () => {
    setProposalType("low-majority-fill");
    setOpenProposalFields([{ target: lowMajorityContractAddress, amount: "" }]);
  };

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
      case "Bonus Score System":
        return web3Context.contractsManager.bsContract;
      case "DMD Names":
        return web3Context.contractsManager.diamondRegistryContract;
      default:
        return web3Context.contractsManager.stContract;
    }
  };

  const createProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let targets: string[] = [];
    let values: string[] = [];
    let calldatas: string[] = [];
    let descriptionSuffix = "";

    try {
      if (proposalType === "open" || proposalType === "low-majority-fill") {
        if (!openProposalFields.some((item) => item.target !== "" || item.amount !== "")) {
          targets = ["0x0000000000000000000000000000000000000000"];
          values = ["0"];
          calldatas = ["0x"];
        } else {
          targets = openProposalFields.map((field, i) => {
            if (!isValidAddress(field.target)) throw new Error(`Invalid Transaction ${i + 1} payout address`);
            else return field.target;
          });
          values = openProposalFields.map((field, i) => {
            if (!field.amount || !(Number(field.amount) >= 0)) throw new Error(`Invalid Transaction ${i + 1} payout amount`);
            else return BigNumber(field.amount).multipliedBy(10 ** 18).toString();
          });
          calldatas = openProposalFields.map(() => "0x");
        }
      } else if (proposalType === "contract-upgrade") {
        targets = contractUpgradeFields.map((field, i) => {
          if (!isValidAddress(field.contractAddress)) throw new Error(`Invalid Transaction ${i + 1} Contract Address`);
          else return field.contractAddress;
        });
        values = targets.map(() => "0");
        calldatas = contractUpgradeFields.map((field, i) => {
          let calldata = field.contractCalldata;
          if (!calldata || calldata.trim().length === 0 || calldata === "0x" || calldata === "0" || calldata === "0x0") {
            throw new Error(`Invalid Transaction ${i + 1} Contract Calldata`);
          }
          return calldata;
        });
      } else if (proposalType === "ecosystem-parameter-change") {
        let encodedCallData = "0x";
        const [contractName, methodName, methodSetter] = epcMethodSetter.split(":");

        const epcContractVal = await getEpcContractValue(contractName, methodName);
        if (new BigNumber(epcValue).isEqualTo(epcContractVal)) return toast.warn("Cannot propose the same value");

        if (["Staking", "Block Reward", "Connectivity Tracker", "Bonus Score System", "DMD Names"].includes(epcContractName) && new BigNumber(epcValue).isNaN()) throw new Error(`Invalid ${methodSetter} value`);

        const contract = getContractByName(epcContractName);
        const contractAddress = contract?.options.address;
        encodedCallData = (contract?.methods as any)[methodSetter](epcValue).encodeABI();

        targets = [contractAddress as string];
        values = ["0"];
        calldatas = [encodedCallData as string];
      } else if (proposalType === "username-moderation") {
        const normalizedUsername = normalizeDmdNameInput(stripDmdSuffix(umUsername));
        const nameError = validateDmdName(normalizedUsername);
        if (nameError) throw new Error(nameError);
        if (!isValidAddress(umOwnerAddress)) throw new Error("Invalid owner address");
        if (!umReasonCategory) throw new Error("Select a reason category");
        if (umReasonCategory === "other" && !umEvidence.trim()) throw new Error("Evidence/Notes is required for \"Other\"");

        const reasonLabel = USERNAME_MODERATION_REASONS.find((r) => r.value === umReasonCategory)?.label ?? umReasonCategory;
        const notes = umEvidence.trim() || "N/A";
        const contract = web3Context.contractsManager.diamondRegistryContract;
        const contractAddress = contract?.options.address;
        const encodedCallData = (contract?.methods as any)
          .moderateName(umOwnerAddress, normalizedUsername, reasonLabel, notes)
          .encodeABI();

        targets = [contractAddress as string];
        values = ["0"];
        calldatas = [encodedCallData as string];
        descriptionSuffix = `\n\n---\nUsername: ${normalizedUsername}.dmd\nOwner Address: ${umOwnerAddress}\nReason category: ${reasonLabel}\nEvidence/Notes: ${notes}`;
      }
    } catch (err: any) {
      return toast.error(err.message);
    }

    await daoContext
      .createProposal(
        proposalType === "username-moderation" ? "contract-upgrade" : proposalType,
        title,
        discussionUrl,
        targets,
        values,
        calldatas,
        description + descriptionSuffix,
      )
      .then((proposalId) => {
        daoContext.getActiveProposals().then(async () => {
          if (proposalId) {
            const proposalDetails = await daoContext.getProposalDetails(proposalId);
            daoContext.setProposalsState([proposalDetails]);
          }
        });
        startTransition(() => {
          router.push("/dao");
        });
      })
      .catch((err) => {});
  };

  const getEpcContractValue = async (contractName: string, methodName: string) => {
    const contract = getContractByName(contractName);

    try {
      if (contract) {
        return await (contract?.methods as any)[EcosystemParameters[contractName][methodName].getter]().call();
      } else {
        return "0";
      }
    } catch (err) {
      return "0";
    }
  };

  const loadEpcData = async (contractName: string, methodName: string) => {
    try {
      const contract = getContractByName(contractName);
      if (!contract) {
        logger.warn(`Contract not available for ${contractName}`);
        setEpcParamRange(["0", "0"]);
        return;
      }

      if (!(contract.methods as any).getAllowedParamsRange) {
        logger.warn(`getAllowedParamsRange method not available for ${contractName}`);
        setEpcParamRange(["0", "0"]);
        return;
      }

      const parameterData = await (contract.methods as any).getAllowedParamsRange(EcosystemParameters[contractName][methodName].setter).call();
      setEpcParamRange(parameterData.range.length ? parameterData.range : ["0", "0"]);
    } catch (err) {
      logger.log(err);
      setEpcParamRange(["0", "0"]);
    }
  };

  return (
    <section className="section">
      <div className={styles.sectionContainer + " sectionContainer"}>
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
                setOpenProposalFields([{ target: "", amount: "" }]);
              }
            }}
          >
            <option value="open">Open Proposal</option>
            <option value="contract-upgrade">Contract upgrade</option>
            {lowMajorityContractAddress && <option value="low-majority-fill">Low Majority Balance Fill</option>}
            <option value="ecosystem-parameter-change">Ecosystem parameter change</option>
            <option value="username-moderation">Username Moderation</option>
          </select>
        </div>

        <form className={styles.propsalForm} onSubmit={createProposal}>
          {
            // Show High Majority warning for high majority proposals
            (proposalType === "open" && !isLowMajorityEligible && daoContext.notEnoughGovernanceFunds) && (
              <p className={styles.warningText}>
                Warning: The total funding requested by active proposals exceeds the available balance in the governance pot. Please create and vote carefully to ensure optimal fund allocation.
              </p>
            )
          }

          {
            // Show Low Majority warning for low majority proposals
            (proposalType === "open" && isLowMajorityEligible && daoContext.notEnoughLowMajorityFunds) && (
              <p className={styles.warningText}>
                Warning: The total funding requested by active proposals exceeds the available balance in the low majority pot. Please vote carefully to ensure optimal fund allocation.
              </p>
            )
          }

          {
            // Show appropriate warnings for low majority fill proposal type
            (proposalType === "low-majority-fill" && daoContext.notEnoughGovernanceFunds) && (
              <p className={styles.warningText}>
                Warning: The total funding requested by active proposals exceeds the available balance in the governance pot. Please create and vote carefully to ensure optimal fund allocation.
              </p>
            )
          }

          <input type="text" className={styles.formInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal Title" required />
          <input type="text" className={styles.formInput} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Proposal Description" required />
          <input type="text" className={styles.formInput} value={discussionUrl} onChange={(e) => setDiscussionUrl(e.target.value)} placeholder="Discussion URL (optional)" />

          {(proposalType === "open" || proposalType === "low-majority-fill") && (
            <>
              <div className={`${styles.balanceInfoContainer} ${proposalType === "open" && !isLowMajorityEligible ? styles.exceedsBalanceContainer : ''}`}>
                <div className={styles.balanceInfo}>
                  <h4>Available Balances:</h4>
                  <p><strong>Governance Pot Balance:</strong> {formatDmd(daoContext.governancePotBalance)}</p>
                  <p><strong>Low Majority Contract Balance:</strong> {formatDmd(lowMajorityContractBalance)}</p>
                </div>

                {proposalType === "open" && lowMajorityContractAddress && (
                  <div className={isLowMajorityEligible ? styles.infoBox : styles.warningBox}>
                    <p>
                      {isLowMajorityEligible ? (
                        <>Your requested amount is within the <strong>Low Majority</strong> Contract balance. This requires ⅓ participation of the total DAO voting weight and at least ⅓ exceeding Yes votes to pass.</>
                      ) : (
                        <>
                          <p>Your requested amount exceeds the <strong>Low Majority</strong> Contract balance. This proposal must meet a higher threshold of ½ participation and at least ½ exceeding Yes votes to pass.</p>
                          <>To proceed with the lower participation and “Yes” vote threshold, add funds to the Low Majority Contract by creating a Low Majority Balance Fill proposal. Click the button below to start.</>
                        </>
                      )}
                    </p>
                    {!isLowMajorityEligible && (
                      <button
                        type="button"
                        className={styles.fillContractButton}
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
                      {index !== 0 && (<i className="fas fa-minus-circle" style={{ color: 'red', marginLeft: 8 }} />)}
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
              ))}
            </>
          )}

          {proposalType === "open" && (
            <span className={styles.addRemoveTransaction} onClick={handleAddOpenProposalField}>
              Add Transaction
              <i className="fas fa-plus-circle" style={{ color: 'green', marginLeft: 8 }} />
            </span>
          )}

              {proposalType === "contract-upgrade" && (
                contractUpgradeFields.map((field, index) => (
                  <div key={index}>
                    <span className={styles.addRemoveTransaction} onClick={() => { index !== 0 && handleRemoveContractCallProposalField(index); }}>
                      Transaction {index + 1}
                      {index !== 0 && (<i className="fas fa-minus-circle" style={{ color: 'red', marginLeft: 8 }} />)}
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
                ))
              )}

          {proposalType === "contract-upgrade" && (
            <span className={styles.addRemoveTransaction} onClick={handleAddContractCallProposalField}>
              Add Transaction
              <i className="fas fa-plus-circle" style={{ color: 'green', marginLeft: 8 }} />
            </span>
          )}

          {proposalType === "ecosystem-parameter-change" && (
            <>
              <p>
                Each parameter from the list can be changed only once a month. If there are multiple proposals to change the same parameter, all with enough "yes" votes and participation during the DAO phase, the community will decide which proposal will be finalized and executed.
              </p>

              <div>
                <div className={styles.epcSelectContainer}>
                  <select
                    className={styles.epcSelect}
                    name="epcContractName"
                    id="epcContractName"
                    value={epcMethodSetter}
                    onChange={async (e) => {
                      const [contractName, methodName, methodSetter] = e.target.value.split(":");
                      const epcContractVal = await getEpcContractValue(contractName, methodName);
                      setEpcValue(epcContractVal);
                      setEpcMethodSetter(`${contractName}:${methodName}:${methodSetter}`);
                      setEpcMethodName(methodName);
                      setEpcContractName(contractName);
                      loadEpcData(contractName, methodName);
                    }}
                  >
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

                  <InfoTooltip content={epcMethodDescription}>
                    <span style={{ marginLeft: 8 }}><i className="fas fa-info-circle" /></span>
                  </InfoTooltip>
                </div>

                <ProposalStepSlider parameterName={epcMethodName} paramsRange={epcParamRange} state={epcValue} setState={setEpcValue} />
              </div>
            </>
          )}

          {proposalType === "username-moderation" && (
            <>
              <input
                type="text"
                value={umUsername}
                onChange={(e) => setUmUsername(e.target.value)}
                placeholder="Username (e.g. example.dmd)"
                className={styles.formInput}
                required
              />
              <input
                type="text"
                value={umOwnerAddress}
                onChange={(e) => setUmOwnerAddress(e.target.value)}
                placeholder="Owner Address"
                className={styles.formInput}
                required
              />
              <select
                className={styles.epcSelect}
                value={umReasonCategory}
                onChange={(e) => setUmReasonCategory(e.target.value)}
                required
              >
                <option value="" disabled>Reason category</option>
                {USERNAME_MODERATION_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
              <textarea
                value={umEvidence}
                onChange={(e) => setUmEvidence(e.target.value)}
                placeholder={umReasonCategory === "other" ? "Evidence/Notes (required for \"Other\")" : "Evidence/Notes (optional)"}
                className={styles.formInput}
                style={{ height: "auto", minHeight: 80, resize: "vertical" }}
                required={umReasonCategory === "other"}
              />

              <div className={`${styles.infoBox} ${styles.moderationOutcomeBox}`}>
                <div className={styles.moderationOutcomeHeader}>
                  <i className="fas fa-circle-info"></i>
                  <strong>Proposal Outcome</strong>
                </div>
                <ul className={styles.usernameModerationInfo}>
                  <li>Proposal submitted to DAO members for voting</li>
                  <li>If approved, the username is blacklisted</li>
                  <li>The name still remains on-chain</li>
                  <li>Diamond server UI hides blacklisted names</li>
                </ul>
              </div>
            </>
          )}

          <p className={styles.feeInfoText}>
            Please note that you pay a proposal fee and a service fee when you submit a new voting creation. You can dismiss the proposal during the proposal phase, but you will lose your funds. If your proposal is accepted, the proposal fee is returned to you on the proposal finalization.
          </p>

          <button>Create</button>
        </form>
      </div>
    </section>
  );
}
