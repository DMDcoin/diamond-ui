import React, { startTransition, useEffect, useState } from "react";

import "./createDao.css";

import { useDaoContext } from "../../contexts/DaoContext";
import { useWeb3Context } from "../../contexts/Web3Context";
import { useNavigate } from "react-router-dom";

import { HiMiniPlusCircle, HiMiniMinusCircle } from "react-icons/hi2";
import { IconContext } from "react-icons";

interface CreateDaoProps {}

const CreateDao: React.FC<CreateDaoProps> = ({}) => {
  const navigate = useNavigate();
  const daoContext = useDaoContext();
  const web3Context = useWeb3Context();

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [proposalType, setProposalType] = useState<string>("open");

  const [epcGasValue, setEpcGasValue] = useState<string>("50");
  const [epcType, setEpcType] = useState<string>("gas-price-value");
  const [openProposalFields, setOpenProposalFields] = useState<{ target: string; amount: string; txText: string }[]>([]);

  useEffect(() => {}, []);

  const createProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // await web3Context.contractsManager.daoContract?.methods.propose(
      //   [targets],
      //   [amounts],
      //   callDatas,
      //   description,
      // ).send({from: web3Context.userWallet.myAddr});
    } catch(err) {
      console.log(err);
    }

    startTransition(() => {navigate('/dao')});
  }

  const handleAddOpenProposalField = () => {
    setOpenProposalFields([...openProposalFields, { target: "", amount: "", txText: "" }]);
  }

  const handleRemoveOpenProposalField = (index: number) => {
    const newFields = [...openProposalFields];
    newFields.splice(index, 1);
    setOpenProposalFields(newFields);
  }

  const handleAddOpenProposalFieldInputChange = (index: number, fieldName: string, value: string) => {
    const newFields: any = [...openProposalFields];
    newFields[index][fieldName] = value;
    setOpenProposalFields(newFields);
  }

  return (
    <div className="mainContainer">
      <span className="createDaoHeading">Create a Proposal</span>

      <div className="proposalTypeContainer">
        <label htmlFor="proposalType">Please choose a proposal type you want to create:</label>
        <select name="proposalType" id="proposalType" value={proposalType} onChange={(e) => setProposalType(e.target.value)}>
          <option value="open">Open Proposal</option>
          <option value="contract-upgrade">Contract upgrade</option>
          <option value="ecosystem-parameter-change">Ecosystem parameter change</option>
        </select>
      </div>

      <form className="propsalForm" onSubmit={createProposal}>
        <input type="text" className="formInput" value={title} onChange={e => setTitle(e.target.value)} placeholder="Proposal Title" />
        <input type="text" className="formInput" value={description} onChange={e => setDescription(e.target.value)} placeholder="Proposal Description" />

        {proposalType === "open" && (
          openProposalFields.map((field, index) => (
            <div key={index}>
              <span className="addRemoveOpenTransaction" onClick={() => handleRemoveOpenProposalField(index)}>
                Transaction {index + 1}
                {/* <IconContext.Provider value={{ color: 'blue', size: '50px' }}> */}
                  <HiMiniMinusCircle size={20} color="red" />
                {/* </IconContext.Provider> */}
              </span>
              <input
                type="text"
                value={field.target}
                onChange={(e) => handleAddOpenProposalFieldInputChange(index, "target", e.target.value)}
                placeholder="Payout Address"
                className="formInput"
              />
              <input
                type="text"
                value={field.amount}
                onChange={(e) => handleAddOpenProposalFieldInputChange(index, "amount", e.target.value)}
                placeholder="Payout Amount"
                className="formInput"
              />
              <input
                type="text"
                value={field.txText}
                onChange={(e) => handleAddOpenProposalFieldInputChange(index, "txText", e.target.value)}
                placeholder="Transaction Text"
                className="formInput"
              />
            </div>
          ))
        )}

        {proposalType === "open" && ( // Render the "Add" button only if the selected option is "open"
          <span className="addRemoveOpenTransaction" onClick={handleAddOpenProposalField}>
            Add Transaction
            <HiMiniPlusCircle size={20} color="green" />
          </span>
        )}

        {
          proposalType === "contract-upgrade" && (
            <div>
              <input type="text" className="formInput" placeholder="Contract Address" />
              <input type="text" className="formInput" placeholder="Contract Calldata" />
            </div>
          )
        }

        {
          proposalType === "ecosystem-parameter-change" && (
            <div>
              <input type="text" className="formInput" placeholder="Discussion Link" />
              <select name="epcType" id="epcType" value={epcType} onChange={(e) => setEpcType(e.target.value)}>
                <option value="gas-price-value">Gas price value</option>
              </select>
              {
                epcType === "gas-price-value" && (
                  <div className="slider-container">
                    <span>{epcGasValue}</span>
                    <div>
                      <span>0</span>
                      <input type="range" className="formInput" min="0" max="100" value={epcGasValue} onChange={e => setEpcGasValue(e.target.value)} />
                      <span>100</span>
                    </div>
                  </div>
                  
                )
              }
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

export default CreateDao;
