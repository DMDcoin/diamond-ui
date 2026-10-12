'use client';

import { useState } from 'react';
import { useWeb3Context } from '@/contexts/Web3';
import { checkNameAvailability } from '@/services/dmdNaming';
import {
  normalizeDmdNameInput,
  stripDmdSuffix,
  validateDmdName,
} from '@/utils/dmdNaming';
import type { DmdNameAvailabilityResult } from '@/types/dmdNaming';
import DmdNameSearchResult from './DmdNameSearchResult';
import './DmdNames.css';

const EXAMPLES = ['diamond', 'web3', 'yourname'];

type SearchState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'invalid'; rawInput: string }
  | { type: 'result'; name: string; result: DmdNameAvailabilityResult };

type Props = {
  variant?: 'homepage' | 'page';
  showExamples?: boolean;
  initialValue?: string;
  onRegisterName?: (name: string, result: DmdNameAvailabilityResult) => void;
};

export default function DmdNameSearch({
  variant = 'page',
  showExamples = true,
  initialValue = '',
  onRegisterName,
}: Props) {
  const { contractsManager, readonlyWeb3, userWallet, web3Initialized } = useWeb3Context();
  const [value, setValue] = useState(initialValue);
  const [searchState, setSearchState] = useState<SearchState>({ type: 'idle' });
  const isHomepage = variant === 'homepage';

  const runSearch = async (rawInput: string) => {
    const stripped = stripDmdSuffix(rawInput);
    const normalized = normalizeDmdNameInput(stripped);

    if (!normalized) {
      setSearchState({ type: 'idle' });
      return;
    }

    const validationError = validateDmdName(normalized);
    if (validationError) {
      setSearchState({ type: 'invalid', rawInput: stripped || rawInput.trim() });
      return;
    }

    const contract = contractsManager.diamondRegistryContract;
    if (!web3Initialized || !contract) {
      setSearchState({
        type: 'result',
        name: normalized,
        result: { status: 'unavailable' },
      });
      return;
    }

    setSearchState({ type: 'loading' });

    try {
      const result = await checkNameAvailability(
        contract,
        readonlyWeb3,
        normalized,
        userWallet.myAddr || undefined,
        contractsManager.diamondNamesContract,
      );
      setSearchState({ type: 'result', name: normalized, result });
    } catch {
      setSearchState({
        type: 'result',
        name: normalized,
        result: { status: 'unavailable' },
      });
    }
  };

  return (
    <div className={`dmd-name-search dmd-name-search--${variant}`}>
      {!isHomepage && (
        <div className="dmd-name-search-header">
          <h2>Search for a DMD name</h2>
          <p>Look up any available or owned DMD name.</p>
        </div>
      )}

      <form
        className="dmd-name-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(value);
        }}
      >
        <div className="dmd-name-search-input-group">
          {isHomepage && <i className="fas fa-search dmd-name-search-icon"></i>}
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            placeholder={isHomepage ? 'Enter a name (e.g. yourname)' : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="dmd-name-search-suffix">.dmd</span>
          <button
            type="submit"
            className="btn-primary dmd-name-search-submit"
            disabled={searchState.type === 'loading'}
          >
            {searchState.type === 'loading' ? (
              <span className="dmd-name-search-submit-loading">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Searching…</span>
              </span>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {showExamples && (
        <div className="dmd-name-search-examples">
          <span>Try examples:</span>
          {EXAMPLES.map((name) => (
            <button key={name} type="button" onClick={() => { setValue(name); runSearch(name); }}>
              {name}.dmd
            </button>
          ))}
        </div>
      )}

      {searchState.type === 'invalid' && (
        <DmdNameSearchResult state="invalid" name="" rawInput={searchState.rawInput} />
      )}

      {searchState.type === 'result' && (
        <DmdNameSearchResult
          state={searchState.result.status}
          name={searchState.name}
          result={searchState.result}
          onRegisterName={
            onRegisterName && searchState.result.status === 'available'
              ? () => onRegisterName(searchState.name, searchState.result)
              : undefined
          }
        />
      )}
    </div>
  );
}
