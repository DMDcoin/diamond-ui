'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useDaoContext } from '@/contexts/DAO';
import { useWeb3Context } from '@/contexts/Web3';
import { useStakingContext } from '@/contexts/Staking';

const STORAGE_KEY = 'dmd_dao_voting_phase_notice_seen';

function readSeenPhase(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeenPhase(phaseCount: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, phaseCount);
  } catch {}
}

export default function DaoVotingPhaseNotice() {
  const { daoPhase, daoPhaseCount, activeProposals, getMyVote } = useDaoContext();
  const { userWallet } = useWeb3Context();
  const { myPool } = useStakingContext();
  const myAddr = userWallet?.myAddr;
  const isValidatorOwner = Boolean(myPool);

  const [votedByMe, setVotedByMe] = useState<Record<string, boolean>>({});
  const shownForPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    setVotedByMe({});
  }, [myAddr]);

  const isVotingPhase = Boolean(daoPhase?.phase) && daoPhase.phase !== '0';
  const votableProposals = useMemo(
    () => (isVotingPhase ? activeProposals.filter((p) => p.state === '2') : []),
    [isVotingPhase, activeProposals]
  );

  useEffect(() => {
    if (!myAddr || !isValidatorOwner || !isVotingPhase || votableProposals.length === 0) return;
    let cancelled = false;

    (async () => {
      const idsToFetch = votableProposals
        .map((p) => String(p.id))
        .filter((id) => votedByMe[id] === undefined);
      if (!idsToFetch.length) return;

      const results = await Promise.all(
        idsToFetch.map(async (id) => {
          try {
            const vote = await getMyVote(id, myAddr);
            return Number(vote?.timestamp) > 0;
          } catch {
            return false;
          }
        })
      );

      if (!cancelled) {
        setVotedByMe((prev) => {
          const next = { ...prev };
          idsToFetch.forEach((id, idx) => { next[id] = results[idx]; });
          return next;
        });
      }
    })();

    return () => { cancelled = true; };
  }, [myAddr, isValidatorOwner, isVotingPhase, votableProposals, votedByMe, getMyVote]);

  useEffect(() => {
    if (!myAddr || !isValidatorOwner || !isVotingPhase || !daoPhaseCount || votableProposals.length === 0) return;

    const allResolved = votableProposals.every((p) => votedByMe[String(p.id)] !== undefined);
    if (!allResolved) return;

    if (shownForPhaseRef.current === daoPhaseCount) return;

    if (readSeenPhase() === daoPhaseCount) {
      shownForPhaseRef.current = daoPhaseCount;
      return;
    }

    const votableCount = votableProposals.filter((p) => !votedByMe[String(p.id)]).length;
    shownForPhaseRef.current = daoPhaseCount;
    writeSeenPhase(daoPhaseCount);

    if (votableCount > 0) {
      toast.info(
        `New DAO voting phase started — ${votableCount} proposal${votableCount === 1 ? '' : 's'} you can vote on.`,
        { autoClose: false, toastId: `dao-voting-phase-${daoPhaseCount}` }
      );
    }
  }, [myAddr, isValidatorOwner, isVotingPhase, daoPhaseCount, votableProposals, votedByMe]);

  return null;
}
