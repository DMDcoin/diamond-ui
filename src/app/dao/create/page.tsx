"use client";

import "../details/[proposalId]/proposal-details.css";
import "../../styles/proposal-status.css";
import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import Web3 from "web3";
import copy from "copy-to-clipboard";
import { toast } from "react-toastify";
import styles from "./Create.module.css";
import { useRouter } from "next/navigation";
import { capitalizeFirstLetter, decodeCallData, formatFunctionName, isValidAddress, timestampToDate } from "@/utils/common";
import { formatDmd, formatDmdFromWei, formatPercent } from "@/utils/format";
import { formatParameterValue } from "@/utils/parameterFormat";
import InfoTooltip from "@/components/InfoTooltip";
import { ParameterComparison, ProposalCreatorCard, ProposalImpactList } from "@/components/ProposalCards";
import { useDaoContext } from "@/contexts/DAO";
import logger from "@/utils/logger";
import { useWeb3Context } from "@/contexts/Web3";
import { useStakingContext } from "@/contexts/Staking";
import { useWalletConnect } from "@/contexts/WalletConnect";
import { useDmdNamesForAddresses } from "@/hooks/useDmdNamesForAddresses";
import { EcosystemParameters } from "@/utils/ecosystemParameters";
import { getProposalImpact } from "@/constants/proposalImpacts";
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

const PROPOSAL_TYPES: { value: ProposalType; label: string }[] = [
  { value: "open", label: "Open Proposal" },
  { value: "contract-upgrade", label: "Contract upgrade" },
  { value: "low-majority-fill", label: "Low Majority Balance Fill" },
  { value: "ecosystem-parameter-change", label: "Ecosystem parameter change" },
  { value: "username-moderation", label: "Username Moderation" },
];

const PARAMETER_DESCRIPTIONS: Record<string, string> = {
  "Create proposal fee": "Fee required to create a governance proposal.",
  "Delegator Min. Stake": "Minimum stake required for a delegator to participate.",
  "Minimum Gas Price": "The lowest gas price allowed for transactions.",
  "Block Gas Limit": "Maximum gas allowed per block.",
  "Governance Pot Share Nominator": "The portion of the governance pot allocated to rewards.",
  "Report Disallow Period": "Timeframe during which a node announces maintenance to avoid penalties.",
  "Minting Fee": "Fee required to mint/register a new DMD name. Gas fees are paid separately.",
};

const PARAMETER_RULE = "Each parameter can change only once a month. If multiple proposals for the same parameter meet the voting requirements, the community decides which one to finalize and execute.";

const FEE_INFO = "If you dismiss the proposal during the proposal phase, the proposal fee will not be returned.";

const FEE_TIP = "The proposal fee is returned if the proposal is accepted and finalized successfully. Estimated Gas is a separate blockchain transaction cost; the actual gas cost may differ when submitted.";

const VOTING_RULE_TIP = "Participation is the share of total DAO voting weight that takes part in the vote. Exceeding Yes is Yes voting weight minus No voting weight. Both must meet the thresholds shown. The applicable rule depends on the proposal type and, for Open Proposals, the requested amount and Low Majority Contract balance.";

const BALANCES_TIP = "Governance Pot: funds available in the main DAO treasury. Low Majority Contract: funds available for proposals that qualify for Low Majority voting rules.";

const REQUIRED = "Please fill out this field.";
const FILL_AMOUNT_REQUIRED = "Amount is required. Enter the DMD amount to send from the Governance Pot to the Low Majority Contract.";
const FILL_AMOUNT_INVALID = "Enter a valid DMD amount using digits and a decimal point, e.g. 1000 or 0.5.";
const GAS_NO_WALLET = "Please connect your wallet first";
const GAS_INCOMPLETE = "Complete the required fields to estimate gas.";
const GAS_FAILED = "Gas estimation failed. Check the proposal details and try again.";
const GAS_REVERTS: Record<string, string> = {
  UnfinalizedProposalsExist: "Proposals from the previous phase must be finalized before a new proposal can be created.",
  ProposalAlreadyExist: "Proposal already exists",
  UnavailableInCurrentPhase: "Cannot propose in voting phase",
  NewValueOutOfRange: "The proposed value is outside the allowed range for this parameter.",
  NewProposalsLimitExceeded: "The limit of new proposals for this phase has been reached.",
};
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const HEX_DATA_PATTERN = /^0x([0-9a-fA-F]{2})+$/;
const DEFAULT_PARAMETER = "Staking:Delegator Min. Stake:setDelegatorMinStake(uint256)";

type ProposalType = "open" | "contract-upgrade" | "low-majority-fill" | "ecosystem-parameter-change" | "username-moderation";
type Payout = { target: string; amount: string };
type ContractCall = { contractAddress: string; contractCalldata: string };
type GasEstimate = { state: "idle" | "loading" | "ready" | "error"; dmd?: BigNumber; reason?: string };
type Decoded = [string, string][] | null;

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
};

const isAddress = (value: string) => isValidAddress(value) && Web3.utils.isAddress(value);

const decode = (contractsManager: any, target: string, calldata: string): Decoded => {
  if (!isAddress(target) || !HEX_DATA_PATTERN.test(calldata)) return null;
  try {
    const result = decodeCallData(contractsManager, target, calldata);
    const entries = Object.entries(result || {});
    return entries.length ? entries.map(([key, value]) => [key, String(value)]) : null;
  } catch {
    return null;
  }
};

function Tip({ content, label, id, placement = "bottom" }: { content: React.ReactNode; label: string; id?: string; placement?: "top" | "bottom" }) {
  return (
    <InfoTooltip placement={placement} label={label} id={id} content={<p>{content}</p>}>
      <i className="fas fa-info-circle info-icon" aria-hidden="true" />
    </InfoTooltip>
  );
}

function Field({ id, label, error, children }: {
  id: string;
  label?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      {label && (
        <div className={styles.labelRow}>
          <label htmlFor={id}>{label}</label>
        </div>
      )}
      {children}
      {error && (
        <p className={styles.error} id={`${id}-error`}>
          <i className="fas fa-exclamation-circle" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function DecodedCall({ entries }: { entries: Decoded }) {
  if (!entries) return null;
  return (
    <div className={`call-data-content ${styles.decoded}`}>
      {entries.map(([key, value]) => (
        <div key={key}><strong>{capitalizeFirstLetter(key)}:</strong> {value}</div>
      ))}
    </div>
  );
}

export default function CreateProposalPage() {
  const router = useRouter();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();
  const stakingContext = useStakingContext();
  const { open: openWalletModal, isConnected } = useWalletConnect();

  const [proposalType, setProposalType] = useState<ProposalType>("open");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discussionUrl, setDiscussionUrl] = useState("");
  const [payouts, setPayouts] = useState<Payout[]>([{ target: "", amount: "" }]);
  const [calls, setCalls] = useState<ContractCall[]>([{ contractAddress: "", contractCalldata: "" }]);
  const [epcKey, setEpcKey] = useState(DEFAULT_PARAMETER);
  const [epcCurrent, setEpcCurrent] = useState<string | null>(null);
  const [epcRange, setEpcRange] = useState<string[] | null>(null);
  const [epcLoadFailed, setEpcLoadFailed] = useState(false);
  const [epcProposed, setEpcProposed] = useState("");
  const [umUsername, setUmUsername] = useState("");
  const [umOwnerAddress, setUmOwnerAddress] = useState("");
  const [umReasonCategory, setUmReasonCategory] = useState("");
  const [umEvidence, setUmEvidence] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [gas, setGas] = useState<GasEstimate>({ state: "idle" });
  const [gasRetry, setGasRetry] = useState(0);
  const [submitInView, setSubmitInView] = useState(false);
  const [today, setToday] = useState("");
  const submitRef = useRef<HTMLButtonElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);

  const { lowMajorityContractAddress } = daoContext;
  const walletAddress = web3Context.userWallet?.myAddr || "";
  const walletNames = useDmdNamesForAddresses(walletAddress ? [walletAddress] : []);
  const walletName = walletAddress ? walletNames[walletAddress.toLowerCase()] : null;

  const [epcContractName, epcMethodName, epcSetter] = epcKey.split(":");
  const epcFunction = epcSetter.replace(/\(.*\)/, "");
  const isPayoutType = proposalType === "open" || proposalType === "low-majority-fill";
  const phase = daoContext.daoPhase?.phase;
  const votingPhase = phase === "1";
  const registryContract = web3Context.contractsManager?.diamondRegistryContract;

  const getContractByName = (name: string) => {
    const manager = web3Context.contractsManager;
    switch (name) {
      case "DAO":
        return manager?.daoContract;
      case "Staking":
        return manager?.stContract;
      case "Certifier":
        return manager?.crContract;
      case "Validator":
        return manager?.vsContract;
      case "Tx Permission":
        return manager?.tpContract;
      case "Block Reward":
        return manager?.brContract;
      case "Connectivity Tracker":
        return manager?.ctContract;
      case "Bonus Score System":
        return manager?.bsContract;
      case "DMD Names":
        return manager?.diamondRegistryContract;
      default:
        return manager?.stContract;
    }
  };

  useEffect(() => {
    if (proposalType !== "ecosystem-parameter-change" || !web3Context.web3Initialized || !web3Context.contractsManager) return;
    let cancelled = false;
    setEpcCurrent(null);
    setEpcRange(null);
    setEpcLoadFailed(false);
    (async () => {
      const contract = getContractByName(epcContractName);
      const params = EcosystemParameters[epcContractName]?.[epcMethodName];
      try {
        if (!contract || !params) throw new Error(`Contract not available for ${epcContractName}`);
        const current = await (contract.methods as any)[params.getter]().call();
        let range: string[] = [];
        if ((contract.methods as any).getAllowedParamsRange) {
          const data = await (contract.methods as any).getAllowedParamsRange(params.setter).call();
          range = (data?.range || []).map((value: any) => String(value));
        }
        if (!cancelled) {
          setEpcCurrent(BigNumber(String(current)).toFixed());
          setEpcRange(range);
          setEpcProposed((prev) => prev || BigNumber(String(current)).toFixed());
        }
      } catch (err) {
        logger.log(err);
        if (!cancelled) setEpcLoadFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [proposalType, epcKey, web3Context.web3Initialized, web3Context.contractsManager]);

  useEffect(() => {
    setToday(timestampToDate(String(Math.floor(Date.now() / 1000))));
  }, []);

  const epcOptions = useMemo(() => {
    if (!epcRange || epcCurrent === null) return [];
    const current = BigNumber(epcCurrent);
    const values = Array.from(new Set(epcRange))
      .map((value) => BigNumber(value))
      .filter((value) => !value.isNaN())
      .sort((a, b) => a.comparedTo(b) ?? 0);
    const lower = [...values].reverse().find((value) => value.isLessThan(current));
    const higher = values.find((value) => value.isGreaterThan(current));
    return [lower, higher].filter((value): value is BigNumber => Boolean(value)).map((value) => value.toFixed());
  }, [epcRange, epcCurrent]);

  const proposedChoices = useMemo(() => {
    if (epcCurrent === null) return [];
    const values = new Map<string, BigNumber>();
    [epcCurrent, ...(epcRange || [])].forEach((value) => {
      const amount = BigNumber(value);
      if (!amount.isNaN()) values.set(amount.toFixed(), amount);
    });
    return [...values.values()].sort((a, b) => a.comparedTo(b) ?? 0).map((value) => value.toFixed());
  }, [epcCurrent, epcRange]);

  const totalRequested = useMemo(() => {
    if (!isPayoutType) return BigNumber(0);
    return payouts.reduce((sum, payout) => {
      const amount = BigNumber(payout.amount);
      return payout.amount && !isNaN(Number(payout.amount)) && amount.isFinite() ? sum.plus(amount) : sum;
    }, BigNumber(0));
  }, [payouts, isPayoutType]);

  const lowMajorityBalance = daoContext.lowMajorityContractBalance;
  const governanceBalance = daoContext.governancePotBalance;
  const withinLowMajority = totalRequested.isLessThanOrEqualTo(lowMajorityBalance);
  const rawType = proposalType === "ecosystem-parameter-change"
    ? "2"
    : proposalType === "contract-upgrade" || proposalType === "username-moderation"
      ? "1"
      : proposalType === "open" && withinLowMajority ? "0" : "3";
  const lowMajorityRule = rawType === "0" || rawType === "2";
  const fundingSource = isPayoutType && totalRequested.isGreaterThan(0)
    ? (proposalType === "open" && withinLowMajority ? "low-majority" : "governance")
    : null;
  const exceedsGovernancePot = fundingSource === "governance" && totalRequested.isGreaterThan(governanceBalance);
  const parameterImpact = proposalType === "ecosystem-parameter-change" ? getProposalImpact(epcFunction) : null;

  const decodedCalls = useMemo(
    () => (proposalType === "contract-upgrade" ? calls.map((call) => decode(web3Context.contractsManager, call.contractAddress, call.contractCalldata)) : []),
    [proposalType, calls, web3Context.contractsManager],
  );
  const callImpact = decodedCalls[0] ? getProposalImpact(decodedCalls[0].find(([key]) => key === "Function Name")?.[1] || "") : null;

  const moderationName = normalizeDmdNameInput(stripDmdSuffix(umUsername));
  const moderationReason = USERNAME_MODERATION_REASONS.find((reason) => reason.value === umReasonCategory)?.label ?? umReasonCategory;
  const moderationNotes = umEvidence.trim() || "N/A";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!title) e["proposal-title"] = REQUIRED;
    if (!description) e["proposal-description"] = REQUIRED;

    if (isPayoutType) {
      const anyFilled = payouts.some((payout) => payout.target !== "" || payout.amount !== "");
      if (proposalType === "low-majority-fill" || anyFilled) {
        payouts.forEach((payout, index) => {
          const fixedTarget = proposalType === "low-majority-fill" && index === 0;
          if (!fixedTarget && !isAddress(payout.target)) e[`payout-${index}-target`] = `Invalid Transaction ${index + 1} payout address`;
          if (!payout.amount || !(Number(payout.amount) >= 0)) {
            e[`payout-${index}-amount`] = proposalType === "low-majority-fill"
              ? (payout.amount ? FILL_AMOUNT_INVALID : FILL_AMOUNT_REQUIRED)
              : `Invalid Transaction ${index + 1} payout amount`;
          }
        });
      }
    }

    if (proposalType === "contract-upgrade") {
      calls.forEach((call, index) => {
        const calldata = call.contractCalldata;
        if (!isAddress(call.contractAddress)) e[`call-${index}-address`] = `Invalid Transaction ${index + 1} Contract Address`;
        if (!calldata.trim() || ["0x", "0", "0x0"].includes(calldata) || !HEX_DATA_PATTERN.test(calldata)) e[`call-${index}-calldata`] = `Invalid Transaction ${index + 1} Contract Calldata`;
      });
    }

    if (proposalType === "ecosystem-parameter-change") {
      if (epcLoadFailed || (epcCurrent !== null && epcRange !== null && epcOptions.length === 0)) e["epc-proposed"] = `Invalid ${epcSetter} value`;
      else if (!epcOptions.includes(epcProposed)) e["epc-proposed"] = "Cannot propose the same value";
    }

    if (proposalType === "username-moderation") {
      if (!moderationName) e["um-name"] = REQUIRED;
      else {
        const nameError = validateDmdName(moderationName);
        if (nameError) e["um-name"] = nameError;
      }
      if (!umOwnerAddress) e["um-owner"] = REQUIRED;
      else if (!isAddress(umOwnerAddress)) e["um-owner"] = "Invalid owner address";
      if (!umReasonCategory) e["um-reason"] = "Select a reason category";
      if (umReasonCategory === "other" && !umEvidence.trim()) e["um-evidence"] = "Evidence/Notes is required for \"Other\"";
    }
    return e;
  }, [title, description, isPayoutType, proposalType, payouts, calls, epcLoadFailed, epcCurrent, epcRange, epcOptions, epcProposed, epcSetter, moderationName, umOwnerAddress, umReasonCategory, umEvidence]);

  const errorCount = Object.keys(errors).length;
  const shown = (id: string) => (submitAttempted || touched[id] ? errors[id] : undefined);
  const touch = (id: string) => setTouched((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  const fieldProps = (id: string) => ({
    id,
    onBlur: () => touch(id),
    "aria-invalid": Boolean(shown(id)),
    "aria-describedby": shown(id) ? `${id}-error` : undefined,
    className: `${styles.input} ${shown(id) ? styles.invalid : ""}`,
  });

  useEffect(() => {
    if (!focusRequest) return;
    const target = document.querySelector<HTMLElement>(`.${styles.page} [aria-invalid="true"], .${styles.page} [data-invalid="true"]`);
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus({ preventScroll: true });
    }
  }, [focusRequest]);

  const buildTransaction = () => {
    let targets: string[] = [];
    let values: string[] = [];
    let calldatas: string[] = [];
    let descriptionSuffix = "";

    if (isPayoutType) {
      const anyFilled = payouts.some((payout) => payout.target !== "" || payout.amount !== "");
      if (proposalType === "open" && !anyFilled) {
        targets = [ZERO_ADDRESS];
        values = ["0"];
        calldatas = ["0x"];
      } else {
        targets = payouts.map((payout, index) => (proposalType === "low-majority-fill" && index === 0 ? lowMajorityContractAddress : payout.target));
        values = payouts.map((payout) => BigNumber(payout.amount).multipliedBy(10 ** 18).toString());
        calldatas = payouts.map(() => "0x");
      }
    } else if (proposalType === "contract-upgrade") {
      targets = calls.map((call) => call.contractAddress);
      values = targets.map(() => "0");
      calldatas = calls.map((call) => call.contractCalldata);
    } else if (proposalType === "ecosystem-parameter-change") {
      const contract = getContractByName(epcContractName);
      targets = [contract?.options.address as string];
      values = ["0"];
      calldatas = [(contract?.methods as any)[epcSetter](epcProposed).encodeABI() as string];
    } else if (proposalType === "username-moderation") {
      targets = [registryContract?.options.address as string];
      values = ["0"];
      calldatas = [(registryContract?.methods as any).moderateName(umOwnerAddress, moderationName, moderationReason, moderationNotes).encodeABI() as string];
      descriptionSuffix = `\n\n---\nUsername: ${moderationName}.dmd\nOwner Address: ${umOwnerAddress}\nReason category: ${moderationReason}\nEvidence/Notes: ${moderationNotes}`;
    }

    return { targets, values, calldatas, fullDescription: description + descriptionSuffix };
  };

  const majorityType = (targets: string[], values: string[]) => {
    if (proposalType === "low-majority-fill") return 1;
    if (proposalType !== "open") return 0;
    if (targets.some((target) => target.toLowerCase() === lowMajorityContractAddress.toLowerCase())) return 1;
    const total = values.reduce((sum, value) => sum.plus(BigNumber(value || "0").dividedBy(1e18)), BigNumber(0));
    return total.isGreaterThan(daoContext.lowMajorityContractBalance) ? 1 : 0;
  };

  const gasFailureReason = async (rpc: Web3, abi: any[], call: { from: string; to: string; data: string; value: string }) => {
    try {
      await rpc.eth.call(call);
    } catch (err: any) {
      const selector = String(err?.data ?? "").match(/0x[0-9a-fA-F]{8}/)?.[0]?.toLowerCase();
      const revert = abi.find((item) => item.type === "error" && Web3.utils.sha3(`${item.name}(${(item.inputs || []).map((input: any) => input.type).join(",")})`)?.slice(0, 10) === selector);
      if (revert && GAS_REVERTS[revert.name]) return GAS_REVERTS[revert.name];
    }
    return GAS_FAILED;
  };

  useEffect(() => {
    const dao = web3Context.contractsManager?.daoContract;
    const rpc = web3Context.readonlyWeb3;
    if (!walletAddress || errorCount > 0 || phase !== "0" || !dao || !rpc) {
      setGas({ state: "idle" });
      return;
    }
    let cancelled = false;
    setGas((prev) => ({ state: "loading", dmd: prev.dmd }));
    const timer = setTimeout(async () => {
      let call;
      try {
        const tx = buildTransaction();
        const data = dao.methods.propose(tx.targets, tx.values, tx.calldatas, title, tx.fullDescription, discussionUrl, majorityType(tx.targets, tx.values)).encodeABI();
        call = { from: walletAddress, to: dao.options.address, data, value: daoContext.proposalFee };
        const [units, gasPrice] = await Promise.all([
          rpc.eth.estimateGas(call),
          web3Context.getGasPriceSafe(),
        ]);
        if (!cancelled) setGas({ state: "ready", dmd: BigNumber(String(units)).multipliedBy(String(gasPrice)).dividedBy(1e18) });
      } catch (err) {
        logger.log("Gas estimate failed", err);
        const reason = call ? await gasFailureReason(rpc, dao.options.jsonInterface, call) : GAS_FAILED;
        if (!cancelled) setGas({ state: "error", reason });
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [walletAddress, errorCount, phase, web3Context.contractsManager, web3Context.readonlyWeb3, proposalType, title, description, discussionUrl, payouts, calls, epcKey, epcProposed, umUsername, umOwnerAddress, umReasonCategory, umEvidence, daoContext.proposalFee, daoContext.lowMajorityContractBalance, lowMajorityContractAddress, gasRetry]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const button = submitRef.current;
      if (button) setSubmitInView(button.getBoundingClientRect().top < window.innerHeight);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const side = sideRef.current;
    if (!side || typeof ResizeObserver === "undefined") return;
    const update = () => side.style.setProperty("--side-h", `${side.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(side);
    return () => observer.disconnect();
  }, []);

  const connectWallet = () => {
    if (isConnected && !walletAddress) {
      web3Context.retryWalletConnection();
      return;
    }
    openWalletModal();
  };

  const clearTouchedRows = () => setTouched((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith("payout-") && !key.startsWith("call-"))));

  const changeType = (next: ProposalType) => {
    setProposalType(next);
    setSubmitAttempted(false);
    clearTouchedRows();
    if (next === "low-majority-fill") setPayouts([{ target: "", amount: "" }]);
    else if (proposalType === "low-majority-fill") setPayouts([{ target: "", amount: "" }]);
  };

  const switchToLowMajorityFill = () => {
    setProposalType("low-majority-fill");
    setSubmitAttempted(false);
    clearTouchedRows();
    setPayouts([{ target: "", amount: "" }]);
  };

  const updatePayout = (index: number, field: keyof Payout, value: string) => {
    setPayouts((prev) => prev.map((payout, i) => (i === index ? { ...payout, [field]: value } : payout)));
  };

  const removePayout = (index: number) => {
    setPayouts((prev) => prev.filter((_, i) => i !== index));
    setTouched((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith("payout-"))));
  };

  const updateCall = (index: number, field: keyof ContractCall, value: string) => {
    setCalls((prev) => prev.map((call, i) => (i === index ? { ...call, [field]: value } : call)));
  };

  const removeCall = (index: number) => {
    setCalls((prev) => prev.filter((_, i) => i !== index));
    setTouched((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith("call-"))));
  };

  const handleCopy = (address: string, e: React.MouseEvent) => {
    copy(address);
    const trigger = e.currentTarget as HTMLElement;
    trigger.classList.add("copied");
    setTimeout(() => trigger.classList.remove("copied"), 2000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);
    if (errorCount > 0) {
      setFocusRequest((n) => n + 1);
      return;
    }

    if (proposalType === "ecosystem-parameter-change") {
      const contract = getContractByName(epcContractName);
      let fresh = "0";
      try {
        fresh = String(await (contract?.methods as any)[EcosystemParameters[epcContractName][epcMethodName].getter]().call());
      } catch (err) {
        logger.log(err);
      }
      if (BigNumber(fresh).isEqualTo(epcProposed)) {
        toast.warn("Cannot propose the same value");
        return;
      }
    }

    let tx;
    try {
      tx = buildTransaction();
    } catch (err: any) {
      toast.error(err?.message || String(err));
      return;
    }

    setSubmitting(true);
    try {
      const proposalId = await daoContext.createProposal(
        proposalType === "username-moderation" ? "contract-upgrade" : proposalType,
        title,
        discussionUrl,
        tx.targets,
        tx.values,
        tx.calldatas,
        tx.fullDescription,
      );
      daoContext.getActiveProposals().then(async () => {
        if (proposalId) {
          const proposalDetails = await daoContext.getProposalDetails(proposalId);
          daoContext.setProposalsState([proposalDetails]);
        }
      });
      startTransition(() => {
        router.push("/dao");
      });
    } catch (err) {
      logger.log(err);
    } finally {
      setSubmitting(false);
    }
  };

  const feeWei = daoContext.proposalFee;
  const feeDmd = feeWei ? BigNumber(feeWei).dividedBy(1e18) : null;
  const feeLabel = feeDmd && feeDmd.isFinite() ? formatDmd(feeDmd) : "—";
  const gasLabel = gas.state === "ready" && gas.dmd ? formatDmd(gas.dmd) : gas.state === "loading" ? "…" : "—";
  const totalCost = gas.state === "ready" && gas.dmd && feeDmd && feeDmd.isFinite() ? feeDmd.plus(gas.dmd) : null;
  const gasHint = !walletAddress ? GAS_NO_WALLET : errorCount > 0 ? GAS_INCOMPLETE : null;
  const thresholdPercent = daoContext.getProposalThreshold ? daoContext.getProposalThreshold(rawType) : (lowMajorityRule ? 33 : 50);
  const totalDaoStake = BigNumber(stakingContext.totalDaoStake || 0);
  const requirement = totalDaoStake.isGreaterThan(0)
    ? `${formatDmdFromWei(totalDaoStake.multipliedBy(thresholdPercent).dividedBy(100))} (${formatPercent(thresholdPercent)} required)`
    : `${formatPercent(thresholdPercent)} required`;
  const submitDisabled = submitting;
  const fundsWarning = (proposalType === "open" && !withinLowMajority && daoContext.notEnoughGovernanceFunds) || (proposalType === "low-majority-fill" && daoContext.notEnoughGovernanceFunds)
    ? "governance"
    : proposalType === "open" && withinLowMajority && daoContext.notEnoughLowMajorityFunds
      ? "low-majority"
      : null;
  const validDiscussionUrl = discussionUrl.trim() && isHttpUrl(discussionUrl.trim()) ? discussionUrl.trim() : "";

  const removeButton = (onClick: () => void) => (
    <button type="button" className={styles.removeBtn} onClick={onClick} aria-label="Remove this transaction from the proposal.">
      <i className="fas fa-minus-circle" aria-hidden="true" />
    </button>
  );

  const renderFundingRequest = () => (
    <div className="proposal-card funding-request-card">
      <div className="card-header"><h3>Funding Request</h3></div>
      <div className="card-content">
        {payouts.map((payout, index) => (
          <div key={index} className={`funding-details ${styles.txBlock}`}>
            {payouts.length > 1 && (
              <div className={styles.txHeader}>
                <span className={styles.txTitle}>Transaction {index + 1}</span>
                {index > 0 && removeButton(() => removePayout(index))}
              </div>
            )}
            <Field id={`payout-${index}-target`} label="Payout Address" error={shown(`payout-${index}-target`)}>
              <input
                {...fieldProps(`payout-${index}-target`)}
                className={`${fieldProps(`payout-${index}-target`).className} ${styles.mono}`}
                value={payout.target}
                onChange={(e) => updatePayout(index, "target", e.target.value)}
                placeholder="Payout Address (optional)"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field id={`payout-${index}-amount`} label="Amount" error={shown(`payout-${index}-amount`)}>
              <input
                {...fieldProps(`payout-${index}-amount`)}
                value={payout.amount}
                onChange={(e) => updatePayout(index, "amount", e.target.value)}
                placeholder="Payout Amount in DMD (optional)"
                inputMode="decimal"
                autoComplete="off"
              />
            </Field>
          </div>
        ))}
        <div className={styles.addRow}>
          <button type="button" className={`btn-secondary btn-sm ${styles.addBtn}`} onClick={() => setPayouts((prev) => [...prev, { target: "", amount: "" }])}>
            <i className="fas fa-plus-circle" aria-hidden="true" /> Add Transaction
          </button>
        </div>
        <div className={`${styles.feeRow} ${styles.totalRow}`} aria-live="polite">
          <span>Total Requested</span>
          <strong>{formatDmd(totalRequested)}</strong>
        </div>
      </div>
    </div>
  );

  const renderLowMajorityFill = () => (
    <div className="proposal-card funding-request-card">
      <div className="card-header"><h3>Low Majority Balance Fill</h3></div>
      <div className="card-content">
        <div className={`funding-details ${styles.txBlock}`}>
          <Field id="payout-0-target" label="Payout Address">
            <input id="payout-0-target" className={`${styles.input} ${styles.mono}`} value={lowMajorityContractAddress} readOnly />
          </Field>
          <Field id="payout-0-amount" label="Amount" error={shown("payout-0-amount")}>
            <input
              {...fieldProps("payout-0-amount")}
              value={payouts[0]?.amount || ""}
              onChange={(e) => updatePayout(0, "amount", e.target.value)}
              placeholder="Payout Amount in DMD"
              aria-required="true"
              inputMode="decimal"
              autoComplete="off"
            />
          </Field>
        </div>
      </div>
    </div>
  );

  const renderContractCalls = () => (
    <div className="proposal-card contract-upgrade-card">
      <div className="card-header"><h3>Contract Upgrade</h3></div>
      <div className="card-content">
        {calls.map((call, index) => (
          <div key={index} className={`technical-details ${styles.txBlock}`}>
            {calls.length > 1 && (
              <div className={styles.txHeader}>
                <span className={styles.txTitle}>Transaction {index + 1}</span>
                {index > 0 && removeButton(() => removeCall(index))}
              </div>
            )}
            <Field id={`call-${index}-address`} label="Target" error={shown(`call-${index}-address`)}>
              <input
                {...fieldProps(`call-${index}-address`)}
                className={`${fieldProps(`call-${index}-address`).className} ${styles.mono}`}
                value={call.contractAddress}
                onChange={(e) => updateCall(index, "contractAddress", e.target.value)}
                placeholder="Contract Address"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field id={`call-${index}-calldata`} error={shown(`call-${index}-calldata`)}>
              <textarea
                {...fieldProps(`call-${index}-calldata`)}
                className={`${fieldProps(`call-${index}-calldata`).className} ${styles.textarea} ${styles.mono}`}
                value={call.contractCalldata}
                onChange={(e) => updateCall(index, "contractCalldata", e.target.value)}
                placeholder="Contract Calldata"
                aria-label="Contract Calldata"
                rows={3}
                spellCheck={false}
              />
            </Field>
            <DecodedCall entries={decodedCalls[index] ?? null} />
          </div>
        ))}
        <div className={styles.addRow}>
          <button type="button" className={`btn-secondary btn-sm ${styles.addBtn}`} onClick={() => setCalls((prev) => [...prev, { contractAddress: "", contractCalldata: "" }])}>
            <i className="fas fa-plus-circle" aria-hidden="true" /> Add Transaction
          </button>
        </div>
        {callImpact && (
          <div className={styles.callImpact}>
            <ProposalImpactList impact={callImpact} showTitle />
          </div>
        )}
      </div>
    </div>
  );

  const renderParameterChange = () => {
    const loading = !epcLoadFailed && (epcCurrent === null || epcRange === null);
    const currentLabel = epcCurrent !== null ? formatParameterValue(epcFunction, epcMethodName, epcCurrent) : epcLoadFailed ? "—" : "…";
    const proposedError = shown("epc-proposed");
    return (
      <div className="proposal-card parameter-change-card">
        <div className="card-header"><h3>Parameter Change</h3></div>
        <div className="card-content">
          <p className={styles.parameterRule}>{PARAMETER_RULE}</p>
          <div className={styles.parameterPicker}>
            <div className={styles.selectWrap}>
              <select
                id="epc-parameter"
                className={styles.input}
                value={epcKey}
                aria-label="Parameter Change"
                onChange={(e) => {
                  setEpcKey(e.target.value);
                  setEpcProposed("");
                }}
              >
                {Object.keys(EcosystemParameters).map((contractName) => (
                  <optgroup key={contractName} label={contractName}>
                    {Object.keys(EcosystemParameters[contractName]).map((methodName) => {
                      const setter = EcosystemParameters[contractName][methodName].setter;
                      return <option key={setter} value={`${contractName}:${methodName}:${setter}`}>{methodName}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
            {PARAMETER_DESCRIPTIONS[epcMethodName] && <Tip content={PARAMETER_DESCRIPTIONS[epcMethodName]} label={epcMethodName} />}
          </div>
          <div className="parameter-name"><h4>{formatFunctionName(epcSetter)}</h4></div>
          <ParameterComparison
            proposedLabel={<label htmlFor="epc-proposed">Proposed</label>}
            current={currentLabel}
            proposed={
              <div className={styles.proposedWrap}>
                <select
                  id="epc-proposed"
                  className={`${styles.proposedSelect} ${proposedError ? styles.invalid : ""}`}
                  value={epcProposed}
                  onChange={(e) => setEpcProposed(e.target.value)}
                  onBlur={() => touch("epc-proposed")}
                  disabled={loading || epcOptions.length === 0}
                  aria-invalid={Boolean(proposedError)}
                  aria-describedby={proposedError ? "epc-proposed-error" : undefined}
                >
                  {loading || !proposedChoices.length ? (
                    <option value="">{loading ? "…" : "—"}</option>
                  ) : (
                    proposedChoices.map((value) => (
                      <option key={value} value={value} disabled={!epcOptions.includes(value)}>{formatParameterValue(epcFunction, epcMethodName, value)}</option>
                    ))
                  )}
                </select>
              </div>
            }
          />
          {proposedError && (
            <p className={styles.error} id="epc-proposed-error">
              <i className="fas fa-exclamation-circle" aria-hidden="true" />
              <span>{proposedError}</span>
            </p>
          )}
          {parameterImpact && <ProposalImpactList impact={parameterImpact} />}
        </div>
      </div>
    );
  };

  const renderModerationFields = () => (
    <div className={styles.moderation}>
      <Field id="um-name" label="Username" error={shown("um-name")}>
        <input {...fieldProps("um-name")} value={umUsername} onChange={(e) => setUmUsername(e.target.value)} placeholder="Username (e.g. example.dmd)" autoComplete="off" spellCheck={false} />
      </Field>
      <Field id="um-owner" label="Owner Address" error={shown("um-owner")}>
        <input
          {...fieldProps("um-owner")}
          className={`${fieldProps("um-owner").className} ${styles.mono}`}
          value={umOwnerAddress}
          onChange={(e) => setUmOwnerAddress(e.target.value)}
          placeholder="Owner Address"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Field id="um-reason" label="Reason Category" error={shown("um-reason")}>
        <div className={styles.selectWrap}>
          <select {...fieldProps("um-reason")} value={umReasonCategory} onChange={(e) => setUmReasonCategory(e.target.value)}>
            <option value="" disabled>Reason category</option>
            {USERNAME_MODERATION_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>{reason.label}</option>
            ))}
          </select>
        </div>
      </Field>
      <Field id="um-evidence" label="Evidence / Notes" error={shown("um-evidence")}>
        <textarea
          {...fieldProps("um-evidence")}
          className={`${fieldProps("um-evidence").className} ${styles.textarea}`}
          value={umEvidence}
          onChange={(e) => setUmEvidence(e.target.value)}
          placeholder={umReasonCategory === "other" ? "Evidence/Notes (required for \"Other\")" : "Evidence/Notes (optional)"}
          rows={3}
        />
      </Field>
      <div className={styles.outcome}>
        <div className={styles.outcomeHeader}>
          <i className="fas fa-circle-info" aria-hidden="true" />
          <strong>Proposal Outcome</strong>
        </div>
        <ul>
          <li>Proposal submitted to DAO members for voting</li>
          <li>If approved, the username is blacklisted</li>
          <li>The name still remains on-chain</li>
          <li>Diamond server UI hides blacklisted names</li>
        </ul>
      </div>
    </div>
  );

  const titleError = shown("proposal-title");

  return (
    <div className={`proposal-details-page-root ${styles.page}`}>
      <section className="proposal-hero">
        <div className="cosmic-grid"></div>
        <div className="cosmic-elements">
          <div className="diamond diamond-1" />
          <div className="diamond diamond-2" />
          <div className="diamond diamond-3" />
          <div className="glow glow-1" />
          <div className="glow glow-2" />
        </div>
        <div className="container">
          <div className="proposal-hero-content">
            <div className="proposal-breadcrumb">
              <a href="/dao">Governance</a>
              <i className="fas fa-chevron-right" />
              <span>Create a Proposal</span>
            </div>
            <div className="proposal-header">
              <h1 className={styles.titleHeading}>
                <span className={`${styles.titleSizer} ${titleError ? styles.invalid : ""}`} data-value={title || "Proposal Title"}>
                  <textarea
                    form="create-proposal-form"
                    id="proposal-title"
                    className={styles.titleInput}
                    value={title}
                    onChange={(e) => setTitle(e.target.value.replace(/\s*\n\s*/g, " "))}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    onBlur={() => touch("proposal-title")}
                    placeholder="Proposal Title"
                    aria-label="Proposal Title"
                    aria-invalid={Boolean(titleError)}
                    aria-describedby={titleError ? "proposal-title-error" : undefined}
                    rows={1}
                    cols={1}
                    spellCheck
                  />
                </span>
              </h1>
              {titleError && (
                <p className={`${styles.error} ${styles.titleError}`} id="proposal-title-error">
                  <i className="fas fa-exclamation-circle" aria-hidden="true" />
                  <span>{titleError}</span>
                </p>
              )}
              <div className="proposal-meta">
                <div className="proposal-date">
                  <i className="fas fa-calendar" /> Date: {today}
                </div>
                <div className="proposal-status draft">
                  <i className="fas fa-pen" /> Draft
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proposal-details">
        <div className="container">
          <div className={styles.typeRow}>
            <label htmlFor="proposal-type" className={styles.typeLabel}>Proposal type</label>
            <select
              id="proposal-type"
              className={styles.typeSelect}
              value={proposalType}
              onChange={(e) => changeType(e.target.value as ProposalType)}
            >
              {PROPOSAL_TYPES.filter((type) => type.value !== "low-majority-fill" || lowMajorityContractAddress).map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <form id="create-proposal-form" className={`proposal-grid ${styles.grid}`} onSubmit={handleSubmit} noValidate>
            <div className="proposal-info">
              <ProposalCreatorCard
                title="Creating With"
                address={walletAddress}
                name={walletName}
                onCopy={handleCopy}
              >
                <div className={styles.walletEmpty}>
                  <span>Please connect your wallet first</span>
                  <button type="button" className="btn-secondary btn-sm" onClick={connectWallet}>
                    <i className="fas fa-wallet" aria-hidden="true" /> Connect Wallet
                  </button>
                </div>
              </ProposalCreatorCard>

              <div className="proposal-card description-card">
                <div className="card-header">
                  <h3>Description</h3>
                </div>
                <div className="card-content">
                  <Field id="proposal-description" error={shown("proposal-description")}>
                    <textarea
                      {...fieldProps("proposal-description")}
                      className={`${fieldProps("proposal-description").className} ${styles.textarea} ${styles.description}`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what you propose and why."
                      aria-label="Proposal Description"
                      rows={6}
                    />
                  </Field>
                  {proposalType === "username-moderation" && renderModerationFields()}
                </div>
              </div>

              {proposalType === "open" && renderFundingRequest()}
              {proposalType === "low-majority-fill" && renderLowMajorityFill()}
              {proposalType === "contract-upgrade" && renderContractCalls()}
              {proposalType === "ecosystem-parameter-change" && renderParameterChange()}
            </div>

            <div ref={sideRef} className={`voting-info ${styles.side}`}>
              <div className="proposal-card voting-card">
                <div className={`card-header ${styles.headerTip}`}>
                  <h3>Voting Rule</h3>
                  <Tip content={VOTING_RULE_TIP} label="Voting Rule" id="voting-rule-tip" />
                </div>
                <div className="card-content">
                  <div className={styles.ruleRow}>
                    <span className={`${styles.ruleBadge} ${lowMajorityRule ? styles.ruleLow : styles.ruleHigh}`}>{lowMajorityRule ? "Low Majority" : "High Majority"}</span>
                  </div>
                  <div className="voting-progress-container">
                    <div
                      className="voting-progress-bar segmented"
                      style={{ ["--yes-width" as any]: "0%", ["--no-width" as any]: "0%", ["--threshold-left" as any]: `${thresholdPercent}%` }}
                      aria-hidden="true"
                    >
                      <div className="bar-segments">
                        <div className={`${styles.requiredFill} ${lowMajorityRule ? styles.requiredLow : styles.requiredHigh}`} style={{ width: `${thresholdPercent}%` }}>
                          <span>{thresholdPercent}%</span>
                        </div>
                      </div>
                      <div className="threshold-line" />
                    </div>
                    <div className="voting-legend">
                      <span className="legend-item"><span className="legend-dot threshold"></span> Acceptance Threshold</span>
                    </div>
                  </div>
                  <div className="voting-stats">
                    <div className="stat-item participation">Exceeding Yes: {requirement}</div>
                    <div className="stat-item participation">Participation: {requirement}</div>
                  </div>
                  {proposalType === "open" && lowMajorityContractAddress && (
                    <div className={styles.dynamic}>
                      <div className={`voting-status-message ${withinLowMajority ? "active" : "votingfinished"}`}>
                        <i className={`fas ${withinLowMajority ? "fa-check-circle" : "fa-exclamation-triangle"}`} aria-hidden="true" />
                        {withinLowMajority ? (
                          <p>Within the Low Majority Contract balance. Low Majority voting rules apply.</p>
                        ) : (
                          <div>
                            <p>Exceeds the Low Majority Contract balance. High Majority voting rules apply.</p>
                            <p>To fund future Low Majority proposals, create a Low Majority Balance Fill proposal.</p>
                          </div>
                        )}
                      </div>
                      {!withinLowMajority && (
                        <button type="button" className={`btn-secondary btn-sm ${styles.switchBtn}`} onClick={switchToLowMajorityFill}>
                          Switch to Low Majority Fill Proposal
                        </button>
                      )}
                    </div>
                  )}
                  {proposalType === "low-majority-fill" && (
                    <div className={`voting-status-message active ${styles.dynamic}`}>
                      <i className="fas fa-info-circle" aria-hidden="true" />
                      <p>Funds the Low Majority Contract for future proposals. This fill proposal requires High Majority voting rules.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="proposal-card discussion-card">
                <div className="card-header">
                  <h3>Discussion</h3>
                </div>
                <div className="card-content">
                  <Field id="discussion-url" error={shown("discussion-url")}>
                    <input
                      {...fieldProps("discussion-url")}
                      type="url"
                      inputMode="url"
                      value={discussionUrl}
                      onChange={(e) => setDiscussionUrl(e.target.value)}
                      placeholder="Discussion URL (optional)"
                      aria-label="Discussion URL (optional)"
                      autoComplete="url"
                    />
                  </Field>
                  {validDiscussionUrl && (
                    <div className={`discussion-links ${styles.discussionPreview}`}>
                      <a href={validDiscussionUrl} target="_blank" rel="noreferrer" className="discussion-link">Discussion Link</a>
                    </div>
                  )}
                </div>
              </div>

              {isPayoutType && (
                <div className="proposal-card">
                  <div className={`card-header ${styles.headerTip}`}>
                    <h3>Available Balances</h3>
                    <Tip content={BALANCES_TIP} label="Available Balances" id="available-balances-tip" />
                  </div>
                  <div className="card-content">
                    <div className={styles.balanceList}>
                      <div className={`${styles.balanceRow} ${exceedsGovernancePot ? styles.balanceExceeded : fundingSource === "governance" ? styles.balanceActive : ""}`}>
                        <span>Governance Pot Balance:</span>
                        <strong>{formatDmd(governanceBalance)}</strong>
                      </div>
                      <div className={`${styles.balanceRow} ${fundingSource === "low-majority" ? styles.balanceActive : ""}`}>
                        <span>Low Majority Contract Balance:</span>
                        <strong>{formatDmd(lowMajorityBalance)}</strong>
                      </div>
                    </div>
                    {exceedsGovernancePot && (
                      <p className={styles.warning}>
                        <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                        <span>Requested amount exceeds available balance</span>
                      </p>
                    )}
                    {fundsWarning && (
                      <p className={styles.warning}>
                        <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                        <span>
                          {fundsWarning === "governance"
                            ? "Warning: The total funding requested by active proposals exceeds the available balance in the governance pot. Please create and vote carefully to ensure optimal fund allocation."
                            : "Warning: The total funding requested by active proposals exceeds the available balance in the low majority pot. Please vote carefully to ensure optimal fund allocation."}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="proposal-card">
                <div className="card-header"><h3>Fee summary</h3></div>
                <div className="card-content">
                  <div className={styles.feeRow}>
                    <span className={styles.rowLabel}>Proposal fee: <Tip content={FEE_TIP} label="Proposal fee:" id="proposal-fee-tip" /></span>
                    <strong>{feeLabel}</strong>
                  </div>
                  <div className={styles.feeRow}>
                    <span>Estimated Gas</span>
                    <strong>{gasLabel}</strong>
                  </div>
                  {totalCost && (
                    <div className={`${styles.feeRow} ${styles.totalRow}`}>
                      <span>Estimated Total</span>
                      <strong>{formatDmd(totalCost)}</strong>
                    </div>
                  )}
                  {gasHint && <p className={styles.gasHint}>{gasHint}</p>}
                  {gas.state === "error" && (
                    <div className={`${styles.warning} ${styles.gasError}`} role="alert">
                      <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                      <span>{gas.reason || GAS_FAILED}</span>
                      {gas.reason === GAS_FAILED && (
                        <button type="button" className={`btn-secondary btn-sm ${styles.retryBtn}`} onClick={() => setGasRetry((n) => n + 1)}>
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                  <p className={styles.note}>{FEE_INFO}</p>
                  {votingPhase && (
                    <div className="voting-status-message votingfinished">
                      <i className="fas fa-clock" aria-hidden="true" />
                      <span>Cannot propose in voting phase</span>
                    </div>
                  )}
                  <button ref={submitRef} type="submit" className={`btn-primary ${styles.submit}`} disabled={submitDisabled}>
                    Create Proposal
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      <div className={`${styles.mobileBar} ${submitInView ? styles.mobileBarHidden : ""}`} aria-hidden={submitInView}>
        <div className={styles.mobileBarCost}>
          <span>Proposal fee:</span>
          <strong>{feeLabel}</strong>
        </div>
        <button type="submit" form="create-proposal-form" className="btn-primary" disabled={submitDisabled} tabIndex={submitInView ? -1 : 0}>
          Create Proposal
        </button>
      </div>
    </div>
  );
}
