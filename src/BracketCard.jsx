import React, { useState } from 'react';
import './App.css';

// Recursive Subtree: Round-by-Round Delay, B&W Elimination Cross, aur Morph Transition ke sath
function WingTree({ node, side, onSelectBattle }) {
  if (!node) return null;

  const isLeaf = !node.children || node.children.length === 0;
  // Har agle round ka animation pichle round ke 0.85s baad chalega
  const roundDelay = `${(node.roundLevel || 0) * 0.85}s`;
  const elimDelay = `${(node.roundLevel || 0) * 0.85 + 0.45}s`;

  // Morph kis disha (top child ya bottom child) se aaya hai
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
          {/* Contestant DP + Eliminated Black & White + Cross Stamp */}
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

export default function BracketCard({ battles = [], contestants = [], bracketHistory = [], onSelectBattle }) {
  // replayKey badalte hi poora morph aur elimination animation dobara shuru se chalega!
  const [replayKey, setReplayKey] = useState(0);

  const historyRounds = Array.isArray(bracketHistory) ? bracketHistory : [];
  const round1Battles = historyRounds.length > 0 ? historyRounds[0] : battles;

  let initialPlayerCount = 0;
  if (round1Battles && round1Battles.length > 0) {
    initialPlayerCount = round1Battles.length * 2;
  } else if (contestants && contestants.length > 0) {
    initialPlayerCount = contestants.length;
  } else {
    initialPlayerCount = 16;
  }

  const totalSlots = Math.max(4, Math.pow(2, Math.ceil(Math.log2(Math.max(4, initialPlayerCount)))));
  const totalRounds = Math.log2(totalSlots);

  // 1. Outermost Round 0 (Leaf Nodes)
  const leafNodes = [];
  for (let i = 0; i < totalSlots; i++) {
    const battleIdx = Math.floor(i / 2);
    const isPlayerA = i % 2 === 0;

    if (round1Battles && round1Battles[battleIdx]) {
      const b = round1Battles[battleIdx];
      const isPastRound = historyRounds.length > 0;
      const liveB = (!isPastRound && battles[battleIdx]) ? battles[battleIdx] : b;

      const vA = liveB.votes_a || 0;
      const vB = liveB.votes_b || 0;
      const hasDecision = isPastRound || (vA !== vB) || !liveB.audio_b;
      const aWins = !liveB.audio_b ? true : vA >= vB;

      if (isPlayerA) {
        leafNodes.push({
          name: liveB.singer_a,
          dp: liveB.dp_a,
          votes: vA,
          isWinner: hasDecision && aWins,
          isEliminated: hasDecision && !aWins,
          roundLevel: 0,
          battleIndex: !isPastRound ? battleIdx : undefined
        });
      } else {
        const isWildcard = !liveB.audio_b || liveB.singer_b === 'Wildcard Entry';
        leafNodes.push({
          name: liveB.singer_b || 'Wildcard',
          dp: liveB.dp_b,
          votes: isWildcard ? 'BYE' : vB,
          isWinner: hasDecision && !aWins && !isWildcard,
          isEliminated: isWildcard || (hasDecision && aWins),
          roundLevel: 0,
          battleIndex: !isPastRound ? battleIdx : undefined
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
        name: `Slot #${i + 1}`,
        dp: null,
        votes: null,
        isPlaceholder: true,
        roundLevel: 0
      });
    }
  }

  // 2. Build Inner Rounds with Morph Source ('top' or 'bottom') & Elimination States
  let currentLevelNodes = leafNodes.map(n => ({ ...n, children: [] }));

  for (let r = 1; r < totalRounds; r++) {
    const nextLevelNodes = [];
    const isCompletedRound = historyRounds.length > r;
    const roundMatches = historyRounds[r] || (historyRounds.length === r ? battles : []);

    for (let i = 0; i < currentLevelNodes.length; i += 2) {
      const topChild = currentLevelNodes[i];
      const bottomChild = currentLevelNodes[i + 1];

      const matchIdx = Math.floor(i / 4);
      const isSideA = (i / 2) % 2 === 0;
      const matchData = roundMatches && roundMatches[matchIdx] ? roundMatches[matchIdx] : null;

      // Pata lagana ki winner upar wale box (top) se morph hokar aaya hai ya niche wale (bottom) se
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
        const hasDecision = isCompletedRound || (vA !== vB) || !matchData.audio_b;
        const aWins = !matchData.audio_b ? true : vA >= vB;

        const thisWon = isSideA ? (hasDecision && aWins) : (hasDecision && !aWins);
        const thisLost = isSideA ? (hasDecision && !aWins) : (hasDecision && aWins);

        parentNode = {
          name: isSideA ? matchData.singer_a : (matchData.singer_b || 'Wildcard'),
          dp: isSideA ? matchData.dp_a : matchData.dp_b,
          votes: isSideA ? vA : (matchData.audio_b ? vB : 'BYE'),
          isWinner: thisWon,
          isEliminated: thisLost,
          isPlaceholder: false,
          roundLevel: r,
          morphedFrom: cameFrom,
          battleIndex: !isCompletedRound ? matchIdx : undefined,
          children: [topChild, bottomChild]
        };
      } else if (topChild?.isWinner || bottomChild?.isWinner) {
        // Winner morphs into the next round slot!
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
          <h3>🏆 Live Tournament Bracket ({totalSlots} Fankaar)</h3>
          <small>❌ Eliminated = Black & White | 🚀 Winner = Morphs to Next Round</small>
        </div>
        <button 
          className="small-btn" 
          onClick={() => setReplayKey(prev => prev + 1)}
          style={{ padding: '5px 12px', fontSize: '0.78rem', backgroundColor: '#5c1522', color: '#ffd700', border: 'none' }}
        >
          🎬 Replay Animation
        </button>
      </div>

      {/* key={replayKey} har baar kholne ya Replay dabane par animation fresh chalayega */}
      <div className="bracket-scroll-area" key={replayKey}>
        <div className="symmetrical-bracket-board">
          
          {/* LEFT WING */}
          <div className="bracket-wing left-wing">
            <WingTree node={leftWingRoot} side="left" onSelectBattle={onSelectBattle} />
          </div>

          {/* CENTER FINALE TROPHY */}
          <div className="bracket-center-vs">
            <div className="trophy-circle">🏆</div>
            <span className="finale-tag">FINALE</span>
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