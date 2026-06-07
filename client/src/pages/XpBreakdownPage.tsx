import { usePlayer } from '../context/PlayerContext';
import { BarChart3, Loader2 } from 'lucide-react';

const YELLOW = '#f1aa1c';
const CYAN = '#01abf4';
const MUTED = '#b0a0c0';
const CARD = '#1a1120';
const BORDER = '#2d1f38';

export default function XpBreakdownPage() {
  const { playerStats, authState, isLoading: playerLoading } = usePlayer();

  const stats = playerStats;
  const level = stats?.level || 1;
  const xp = stats?.xp || 0;
  const totalXp = stats?.totalXp || 0;
  const nextXp = stats?.xpForNextLevel || 1000;
  const percent = stats?.xpProgressPercent || 0;

  if (playerLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2
          className="w-10 h-10 animate-spin mb-4"
          style={{ color: YELLOW }}
        />
        <p
          className="text-sm font-black uppercase tracking-[0.4em]"
          style={{ color: YELLOW }}
        >
          Loading XP Data...
        </p>
      </div>
    );
  }

  if (authState === 'needs_token' || authState === 'token_pending') {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-20 text-center">
        <div
          className="raider-box p-12 border"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <BarChart3
            className="w-12 h-12 mx-auto mb-6"
            style={{ color: YELLOW }}
          />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
            TOKEN REQUIRED
          </h2>
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: MUTED }}
          >
            Link your ARC Raiders token to view XP breakdown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8 pb-12">
      {/* Header */}
      <div className="border-b pb-6 mb-6" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6" style={{ color: YELLOW }} />
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            XP BREAKDOWN
          </h1>
        </div>
        <p
          className="text-sm uppercase tracking-[0.4em]"
          style={{ color: MUTED }}
        >
          ARC Raiders level XP
        </p>
      </div>

      {/* XP Progress Card */}
      <div
        className="raider-box border p-6 mb-6"
        style={{ background: CARD, borderColor: BORDER }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 flex items-center justify-center font-black text-2xl"
              style={{
                background: `${YELLOW}15`,
                border: `2px solid ${YELLOW}50`,
                color: YELLOW,
              }}
            >
              {level}
            </div>
            <div>
              <p className="text-base font-black text-white uppercase tracking-wider">
                Raider Level {level}
              </p>
              <p className="text-sm mt-0.5" style={{ color: MUTED }}>
                {xp.toLocaleString()} / {nextXp.toLocaleString()} XP
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black" style={{ color: YELLOW }}>
              {percent}%
            </p>
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: MUTED }}
            >
              TO NEXT LEVEL
            </p>
          </div>
        </div>
        <div
          className="h-3 rounded-sm overflow-hidden"
          style={{ background: BORDER }}
        >
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${percent}%`,
              background: `linear-gradient(90deg, ${YELLOW}, ${CYAN})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs font-black" style={{ color: MUTED }}>
            Level {level}
          </p>
          <p className="text-xs font-black" style={{ color: MUTED }}>
            Level {level + 1}
          </p>
        </div>
      </div>
    </div>
  );
}
