import React, { useState } from 'react';
import './App.css';

function WingTree({ node, side, onSelectBattle }) {
  if (!node) return null;

  const isLeaf = !node.children || node.children.length === 0;
  const roundDelay = `${(node.roundLevel || 0) * 0.65}s`;
  const elimDelay = `${(node.roundLevel || 0) * 0.65 + 0.35}s`;

  const morphClass = node.morphedFrom
    ? side === 'left'
      ? node.morphedFrom === 'top' ? 'morph-from-left-top' : 'morph-from-left-bottom'
      : node.morphedFrom === 'top' ? 'morph-from-right-top' : 'morph-from-right-bottom'
    : 'pop-in-box';

  const fallbackDp = `https://ui-avatars.com/api/?name=${encodeURIComponent(node.name || 'M')}&background=5c1522&color=fff&size=80`;

  return (
    <div className={`bracket-subtree ${side === 'left' ? 'flow-left' : 'flow-right'}`}>
      {!isLeaf && (
        <div className="bracket-children-col">
          <div 
            className={`bracket-child-branch top-branch ${node.children[0]?.isWinner ? 'winner-path-line' : ''}`}
            style={{ '--line-delay': roundDelay }}
          >
            <WingTree node={node.children[0]} side={side} onSelectBattle={onSelectBattle} />
          </div>
          <div 
            className={`bracket-child-branch bottom-branch ${node.children[1]?.isWinner ? 'winner-path-line' : ''}`}
            style={{ '--line-delay': roundDelay }}
          >
            <WingTree node={node.children[1]} side={side} onSelectBattle={onSelectBattle} />
          </div>
        </div>
      )}

      <div className="bracket-node-wrapper" style={{ '--line-delay': roundDelay }}>
        <div 
          className={`bracket-box ${morphClass} ${node.isWinner ? 'winner-box' : ''} ${node.isEliminated ? 'eliminated-box' : ''} ${node.isPlaceholder ? 'empty-box' : ''}`}
          style={{ '--anim-delay': roundDelay, '--elim-delay': elimDelay }}
          onClick={() => node.battleIndex !== undefined && onSelectBattle && onSelectBattle(node.battleIndex)}
          title={node.name || 'TBD'}
        >
          {!node.isPlaceholder && (
            <div className="bracket-dp-container">
              <img 
                src={node.dp || fallbackDp} 
                alt={node.name} 
                className={`bracket-mini-dp ${node.isEliminated ? 'bw-eliminated-dp' : ''} ${node.isWinner ? 'winner-glow-dp' : ''}`}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = fallbackDp;
                }}
              />
              {node.isEliminated && (
                <span className="eliminated-cross-badge" style={{ '--elim-delay': elimDelay }}>✖</span>
              )}
            </div>
          )}

          <span className={`bracket-player-name ${node.isEliminated ? 'eliminated-text' : ''}`}>
            {node.name || 'TBD'}
          </span>

          {node.votes !== undefined && node.votes !== null && (
            <span className={`bracket-vote-pill ${node.isEliminated ? 'elim-pill' : ''}`}>
              {node.votes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BracketCard({ battles = [], contestants = [], bracketHistory = [], isVotingEnded = false, onSelectBattle }) {
  const [replayKey, setReplayKey] = useState(0);

  const historyRounds = Array.isArray(bracketHistory) ? bracketHistory : [];
  const round1Battles = historyRounds.length > 0 ? historyRounds[0] : battles;

  // 1. Exact Player Count nikalna (1v1 ke liye 2 slots, 4 ke liye 4, 8 ke liye 8)
  let initialPlayerCount = 0;
  if (round1Battles && round1Battles.length > 0) {
    initialPlayerCount = round1Battles.reduce((acc, b) => acc + (b.audio_b && b.singer_b !== 'Wildcard Entry' ? 2 : 1), 0);
    if (initialPlayerCount < round1Battles.length * 2) {
      initialPlayerCount = round1Battles.length * 2;
    }
  } else if (contestants && contestants.length > 0) {
    initialPlayerCount = contestants.length;
  } else {
    initialPlayerCount = 4;
  }

  // Ab minimum 2 slots ho sakte hain (1v1 Finale ke liye extra boxes nahi banenge!)
  const totalSlots = Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(2, initialPlayerCount)))));
  const totalRounds = Math.log2(totalSlots);

  // 2. Outermost Round 0 (Leaf Nodes)
  const leafNodes = [];
  const isRound0Finished = historyRounds.length > 0 || isVotingEnded;

  for (let i = 0; i < totalSlots; i++) {
    const battleIdx = Math.floor(i / 2);
    const isPlayerA = i % 2 === 0;

    if (round1Battles && round1Battles[battleIdx]) {
      const b = round1Battles[battleIdx];
      const liveB = (historyRounds.length === 0 && battles[battleIdx]) ? battles[battleIdx] : b;

      const vA = liveB.votes_a || 0;
      const vB = liveB.votes_b || 0;
      const isWildcard = !liveB.audio_b || liveB.singer_b === 'Wildcard Entry';

      // SIRF tabhi eliminate ya promote dikhao jab Round sach mein khatam ho chuka ho!
      const hasDecision = isRound0Finished || isWildcard;
      const aWins = isWildcard ? true : vA >= vB;

      if (isPlayerA) {
        leafNodes.push({
          name: liveB.singer_a,
          dp: liveB.dp_a,
          votes: vA,
          isWinner: hasDecision && aWins,
          isEliminated: hasDecision && !aWins,
          roundLevel: 0,
          battleIndex: historyRounds.length === 0 ? battleIdx : undefined
        });
      } else {
        leafNodes.push({
          name: liveB.singer_b || 'Wildcard',
          dp: liveB.dp_b,
          votes: isWildcard ? 'BYE' : vB,
          isWinner: hasDecision && !aWins && !isWildcard,
          isEliminated: isWildcard || (hasDecision && aWins),
          roundLevel: 0,
          battleIndex: historyRounds.length === 0 ? battleIdx : undefined
        });
      }
    } else if (contestants && contestants[i]) {
      leafNodes.push({
        name: contestants[i].name,
        dp: contestants[i].dp_url,
        votes: null,
        roundLevel: 0
      });
    } else {
      leafNodes.push({
        name: `TBD`,
        dp: null,
        votes: null,
        isPlaceholder: true,
        roundLevel: 0
      });
    }
  }

  // 3. Inner Rounds (Sirf tabhi bharenge jab pichla round khatam ho chuka ho!)
  let currentLevelNodes = leafNodes.map(n => ({ ...n, children: [] }));

  for (let r = 1; r < totalRounds; r++) {
    const nextLevelNodes = [];
    const isThisRoundFinished = historyRounds.length > r || (historyRounds.length === r && isVotingEnded);
    const roundMatches = historyRounds[r] || (historyRounds.length === r ? battles : []);

    for (let i = 0; i < currentLevelNodes.length; i += 2) {
      const topChild = currentLevelNodes[i];
      const bottomChild = currentLevelNodes[i + 1];

      const matchIdx = Math.floor(i / 4);
      const isSideA = (i / 2) % 2 === 0;
      const matchData = roundMatches && roundMatches[matchIdx] ? roundMatches[matchIdx] : null;
      const cameFrom = topChild?.isWinner ? 'top' : bottomChild?.isWinner ? 'bottom' : 'top';

      let parentNode = {
        name: 'TBD',
        dp: null,
        votes: null,
        isPlaceholder: true,
        roundLevel: r,
        children: [topChild, bottomChild]
      };

      if (matchData) {
        const vA = matchData.votes_a || 0;
        const vB = matchData.votes_b || 0;
        const isWildcard = !matchData.audio_b || matchData.singer_b === 'Wildcard Entry';
        const hasDecision = isThisRoundFinished || isWildcard;
        const aWins = isWildcard ? true : vA >= vB;

        const thisWon = isSideA ? (hasDecision && aWins) : (hasDecision && !aWins);
        const thisLost = isSideA ? (hasDecision && !aWins) : (hasDecision && aWins);

        parentNode = {
          name: isSideA ? matchData.singer_a : (matchData.singer_b || 'Wildcard'),
          dp: isSideA ? matchData.dp_a : matchData.dp_b,
          votes: isSideA ? vA : (isWildcard ? 'BYE' : vB),
          isWinner: thisWon,
          isEliminated: thisLost,
          isPlaceholder: false,
          roundLevel: r,
          morphedFrom: cameFrom,
          battleIndex: historyRounds.length === r ? matchIdx : undefined,
          children: [topChild, bottomChild]
        };
      } else if (topChild?.isWinner || bottomChild?.isWinner) {
        // Pichla round khatam hone par hi winner agle box mein morph hokar aayega
        const advancingChild = topChild?.isWinner ? topChild : bottomChild;
        parentNode = {
          name: advancingChild.name,
          dp: advancingChild.dp,
          votes: null,
          isWinner: false,
          isEliminated: false,
          isPlaceholder: false,
          roundLevel: r,
          morphedFrom: topChild?.isWinner ? 'top' : 'bottom',
          children: [topChild, bottomChild]
        };
      }

      nextLevelNodes.push(parentNode);
    }
    currentLevelNodes = nextLevelNodes;
  }

  const leftWingRoot = currentLevelNodes[0];
  const rightWingRoot = currentLevelNodes[1];

  return (
    <div className="bracket-card-Wrapper">
      <div className="bracket-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '0 8px' }}>
        <div style={{ textAlign: 'left' }}>
          <h3>🏆 Mehfil Matchmaking Bracket</h3>
          <small>Har round ka samay pura hone par vijeta aage badhenge</small>
        </div>
        <button 
          className="small-btn" 
          onClick={() => setReplayKey(prev => prev + 1)}
          style={{ padding: '5px 12px', fontSize: '0.78rem', backgroundColor: '#5c1522', color: '#ffd700', border: 'none' }}
        >
          🎬 Replay
        </button>
      </div>

      <div className="bracket-scroll-area" key={replayKey}>
        <div className="symmetrical-bracket-board" style={{ gap: totalSlots === 2 ? '15px' : '10px' }}>
          
          {/* LEFT WING */}
          <div className="bracket-wing left-wing">
            <WingTree node={leftWingRoot} side="left" onSelectBattle={onSelectBattle} />
          </div>

          {/* CENTER FINALE TROPHY */}
          <div className="bracket-center-vs">
            <div className="trophy-circle">🏆</div>
            <span className="finale-tag" style={{ fontSize: totalSlots === 2 ? '0.75rem' : '0.65rem' }}>
              {totalSlots === 2 ? '1 VS 1' : 'FINALE'}
            </span>
          </div>

          {/* RIGHT WING */}
          <div className="bracket-wing right-wing">
            <WingTree node={rightWingRoot} side="right" onSelectBattle={onSelectBattle} />
          </div>

        </div>
      </div>
    </div>
  );
}