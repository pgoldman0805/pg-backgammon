import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutoAnalysis } from '../analysis';
import type { Difficulty, Engine } from '../engine';
import { stepMsFor, useAnimationSpeed } from '../play/animation';
import { type Autoplay, createAutoplay } from '../play/autoplay';
import { Board } from '../play/Board';
import { getPlayEngine } from '../play/engineInstance';
import {
  createEngineOpponent,
  type EngineOpponent,
  type EngineOpponentState,
} from '../play/opponent';
import { createRaceAutopilot, type RaceAutopilot } from '../play/raceAutopilot';
import { canCommit, canUndo, forcedPlay, isDance } from '../play/selectors';
import {
  AUTO_FORCED_PLAYS_KEY,
  AUTO_SKIP_DANCES_KEY,
  getAutoRollMode,
  getStoredSwitch,
  rememberMatchStarted,
  rememberSetupChoice,
  tutorModeDefault,
  useAutoRollMode,
} from '../play/settings';
import { createPlayStore, type PlayStore } from '../play/store';
import { createTutor, type Tutor, type TutorState } from '../play/tutor';
import { createRemoteApi } from '../remote/api';
import {
  readMoveSeconds,
  readPlayerName,
  writeMoveSeconds,
  writePlayerName,
} from '../remote/playerPrefs';
import { clearSeat, writeSeat } from '../remote/seats';
import {
  canDouble,
  canTakeback,
  type GameEndKind,
  initialBoard,
  isRace,
  type MatchState,
  opponent,
  type Player,
  type Point,
} from '../rules';
import {
  getMatchStorage,
  isStoredMatch,
  type MatchStorage,
  type StoredMatch,
  useMatchPersistence,
} from '../storage';
import { playerName } from '../ui/format';
import { MoveTimerField, NameField } from './play/OnlineFields';
import { OnlineGames } from './play/OnlineGames';
import { PlayDialog } from './play/PlayDialog';
import { PlayHud } from './play/PlayHud';
import {
  DifficultyPicker,
  EngineNote,
  GameTypePicker,
  LengthPicker,
  MONEY_HINT,
  SettingSwitch,
  TUTOR_HINT,
} from './play/PlaySetup';
import {
  currentXgid,
  type GameType,
  gameEndText,
  IDLE_OPPONENT,
  initialSetup,
  KIND_POINTS,
  KIND_TEXT,
  localSidesFor,
  type PlayMode,
  type PlaySetup,
  points,
  RESIGN_LABEL,
  setupFromConfig,
  statusText,
  storedMatchName,
} from './play/playFormat';
import { RemotePanel } from './play/RemotePanel';
import { EvalBar, FeedbackNote } from './play/tutorSurfaces';
import { type RemoteDeps, useRemoteRoom } from './play/useRemoteRoom';
import { useTurnTitle } from './play/useTurnTitle';
import '../play/board.css';

export interface PlayProps {
  /** Injectable for tests; defaults to a fresh store with fair dice. */
  store?: PlayStore;
  /** Injectable for tests; defaults to the shared lazily-loaded engine. */
  engine?: Engine;
  /** Initial mode, difficulty and length; mode governs injected matches. */
  defaultSetup?: PlaySetup;
  /** Pause between the computer's visible steps, in milliseconds. */
  opponentStepMs?: number;
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: MatchStorage;
  /** Resume this stored match on arrival (Analyze's "Resume" route state). */
  resumeMatchId?: string;
  /** A remote room to play in (`/play/:roomId`); the page then plays through
   * the room's session instead of a local store. */
  roomId?: string;
  /** Injectable for tests; defaults to the real room API at this origin. */
  remote?: RemoteDeps;
}

export function Play({
  store: injectedStore,
  engine: injectedEngine,
  defaultSetup,
  opponentStepMs,
  storage: injectedStorage,
  resumeMatchId,
  roomId,
  remote: injectedRemote,
}: PlayProps = {}) {
  const [store, setStore] = useState(() => injectedStore ?? createPlayStore());
  const [engine] = useState(() => injectedEngine ?? getPlayEngine());
  const [storage] = useState(() => injectedStorage ?? getMatchStorage());
  const { match } = useSyncExternalStore(store.subscribe, store.getState);
  const engineStatus = useSyncExternalStore(
    engine.onStatusChange,
    () => engine.status,
  );
  const [setup, setSetup] = useState<PlaySetup>(() =>
    roomId
      ? { ...initialSetup(), mode: 'remote' }
      : (defaultSetup ?? initialSetup()),
  );
  const [selected, setSelected] = useState<Point | 'bar' | null>(null);
  const [resignOpen, setResignOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState<string | null>(null);
  const [opponentState, setOpponentState] =
    useState<EngineOpponentState>(IDLE_OPPONENT);
  const opponentRef = useRef<EngineOpponent | null>(null);
  const previousMatch = useRef<MatchState | null>(null);
  // Tutor mode starts from its first-matches default (ticket 31): a saved
  // Settings preference if there is one, otherwise on for a newcomer's first
  // few matches. The toggle then rules the live match alone and never writes
  // the default back.
  const [tutorOn, setTutorOn] = useState(() => tutorModeDefault());
  const [tutorState, setTutorState] = useState<TutorState | null>(null);
  const tutorRef = useRef<Tutor | null>(null);
  const autopilotRef = useRef<RaceAutopilot | null>(null);
  const [autopilotOn, setAutopilotOn] = useState(false);
  // The auto-roll mode is reachable mid-match from the HUD, not only from
  // Settings — the same persisted key, so the two stay in sync. The autoplay
  // controller reads it live, so a change applies from the next decision;
  // recheck() also re-examines the current moment at once, so switching to
  // "always" (or "in races" while in a race) rolls the stop at hand right away.
  const autoplayRef = useRef<Autoplay | null>(null);
  const [autoRollMode, setAutoRollMode] = useAutoRollMode();
  const handleAutoRollChange = (mode: typeof autoRollMode) => {
    setAutoRollMode(mode);
    autoplayRef.current?.recheck();
  };
  // The checker-animation speed paces the opponent's and autoplay's visible
  // steps too (ticket 20), so "fast" feels fast end to end. An injected
  // opponentStepMs (tests) always wins.
  const [animationSpeed] = useAnimationSpeed();
  const stepMs = opponentStepMs ?? stepMsFor(animationSpeed);
  // One title/description id pair for whichever decision or result dialog is
  // open (ticket 44); only one is ever mounted at a time, so sharing is safe.
  const dialogTitleId = useId();
  const dialogDescId = useId();
  const persistence = useMatchPersistence(store, storage);
  // Ticket 08: finished games analyze themselves in the background.
  useAutoAnalysis(store, storage);
  const autoResumed = useRef(false);
  const [remote] = useState<RemoteDeps>(
    () => injectedRemote ?? { api: createRemoteApi(), origin: location.origin },
  );
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [moveSeconds, setMoveSeconds] = useState(readMoveSeconds);
  const [createError, setCreateError] = useState(false);
  const roomView = useRemoteRoom(roomId, remote);
  const seated = roomView?.kind === 'seated' ? roomView : null;
  const remoteSession = seated?.session ?? null;
  const rememberedRoom = useRef<string | null>(null);

  // Seated in a room: the room's session is this page's store from now on.
  useEffect(() => {
    if (remoteSession) {
      setStore(remoteSession);
    }
  }, [remoteSession]);

  // Start the lazy engine load on first visit; the shell stays usable and
  // failures surface through the observable status.
  useEffect(() => {
    engine.initialize().catch(() => {});
  }, [engine]);

  // The engine opponent lives alongside a vs-computer match, driving Black
  // through the same store the human plays White through.
  useEffect(() => {
    if (setup.mode !== 'computer') {
      setOpponentState(IDLE_OPPONENT);
      return;
    }
    const engineOpponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: setup.difficulty,
      stepMs,
    });
    opponentRef.current = engineOpponent;
    setOpponentState(engineOpponent.getState());
    const unsubscribe = engineOpponent.subscribe(() =>
      setOpponentState(engineOpponent.getState()),
    );
    return () => {
      unsubscribe();
      engineOpponent.dispose();
      opponentRef.current = null;
    };
  }, [store, engine, setup, stepMs]);

  // Tutor mode (GLOSSARY): one toggle enabling all live analysis. The
  // controller lives exactly as long as the toggle is on in a vs-computer
  // setting; everything it offers runs at full engine strength.
  useEffect(() => {
    if (!tutorOn || setup.mode !== 'computer') {
      setTutorState(null);
      return;
    }
    const tutor = createTutor({ store, engine, player: 'white' });
    tutorRef.current = tutor;
    setTutorState(tutor.getState());
    const unsubscribe = tutor.subscribe(() => setTutorState(tutor.getState()));
    return () => {
      unsubscribe();
      tutor.dispose();
      tutorRef.current = null;
    };
  }, [store, engine, tutorOn, setup.mode]);

  const game = match?.game ?? null;
  const phase = match?.phase ?? null;
  const turn = game?.turn ?? null;
  const vsComputer = setup.mode === 'computer';
  // Which sides this screen's human controls: in a remote room, the seat.
  const localSide: Player | null = seated?.side ?? null;
  const localSides = useMemo(
    () => localSidesFor(setup.mode, localSide),
    [setup.mode, localSide],
  );

  // A remote match is persisted once per room: continue this room's stored
  // row if there is one, else begin a new one carrying the room and seat. A
  // finished row (any valid row, not only in-progress ones) is final: the
  // room is only being revisited, so nothing is persisted at all.
  useEffect(() => {
    if (
      !roomId ||
      !seated ||
      store !== seated.session ||
      !match ||
      !persistence.ready ||
      rememberedRoom.current === roomId
    ) {
      return;
    }
    rememberedRoom.current = roomId;
    const { length } = match;
    const localSide = seated.side;
    void storage
      .list()
      .then((rows) =>
        rows.find((row) => isStoredMatch(row) && row.config.roomId === roomId),
      )
      .catch(() => undefined)
      .then((stored) => {
        if (
          rememberedRoom.current !== roomId ||
          stored?.status === 'finished'
        ) {
          return;
        }
        if (stored) {
          persistence.adopt(stored);
        } else {
          persistence.begin({ mode: 'remote', length, roomId, localSide });
        }
      });
    setSetup((current) => ({ ...current, length: match.length }));
  }, [roomId, seated, store, match, persistence, storage]);

  // The autoplay controller (spec stories 43-44) acts for every human side —
  // just White vs the computer, both in hot-seat. Its two settings live in
  // Settings alone (ticket 25); reading localStorage at decision time keeps
  // a flip made there honored from the next decision moment on.
  useEffect(() => {
    const autoplay = createAutoplay({
      store,
      players: localSides,
      settings: () => ({
        autoRoll: getAutoRollMode(),
        autoForcedPlays: getStoredSwitch(AUTO_FORCED_PLAYS_KEY, true),
        autoSkipDances: getStoredSwitch(AUTO_SKIP_DANCES_KEY, true),
      }),
      stepMs,
    });
    autoplayRef.current = autoplay;
    return () => {
      autoplay.dispose();
      autoplayRef.current = null;
    };
  }, [store, localSides, stepMs]);

  // The race autopilot (spec story 59) lives alongside a vs-computer match
  // only — in hot-seat its button never appears and no controller runs.
  useEffect(() => {
    if (!vsComputer) {
      setAutopilotOn(false);
      return;
    }
    const autopilot = createRaceAutopilot({
      store,
      engine,
      player: 'white',
      stepMs,
    });
    autopilotRef.current = autopilot;
    setAutopilotOn(autopilot.getState().active);
    const unsubscribe = autopilot.subscribe(() =>
      setAutopilotOn(autopilot.getState().active),
    );
    return () => {
      unsubscribe();
      autopilot.dispose();
      autopilotRef.current = null;
      setAutopilotOn(false);
    };
  }, [store, engine, vsComputer, stepMs]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selection is per-position; any turn change (movement, undo, commit) invalidates it
  useEffect(() => {
    setSelected(null);
  }, [turn]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the picker belongs to one decision moment; any phase change closes it
  useEffect(() => {
    setResignOpen(false);
  }, [phase]);

  // When doubling is impossible the pre-roll moment carries no decision, so
  // the human's dice roll themselves (minimal friction, as before).
  useEffect(() => {
    if (match?.phase !== 'pre-roll') {
      return;
    }
    if (!match.toRoll || !localSides.includes(match.toRoll)) {
      return;
    }
    if (!canDouble(match)) {
      store.dispatch({ type: 'roll' });
    }
  }, [match, localSides, store]);

  // A declined resignation leaves a short note on the status line, cleared by
  // the next visible progress.
  useEffect(() => {
    const previous = previousMatch.current;
    previousMatch.current = match;
    if (!match || !previous || match === previous) {
      return;
    }
    const last = match.decisions[match.decisions.length - 1];
    if (
      previous.phase === 'resign-offered' &&
      match.phase !== 'resign-offered' &&
      last?.type === 'resign-response' &&
      !last.accepted
    ) {
      setDeclineNote(`${playerName(last.player)} declined — play on.`);
    } else if (
      match.phase !== previous.phase ||
      match.game.record.plays !== previous.game.record.plays
    ) {
      setDeclineNote(null);
    }
  }, [match]);

  const board = game?.board ?? initialBoard();
  // The race autopilot's moment (spec story 59): a vs-computer Race with the
  // game still live. Everywhere else — contact, hot-seat, a settled game —
  // the button stays out of the controls.
  const autopilotAvailable =
    vsComputer &&
    match != null &&
    phase !== 'game-over' &&
    phase !== 'match-over' &&
    isRace(board);
  const dance = isDance(game);
  const forced =
    game && turn && turn.movements.length === 0 ? forcedPlay(game) : null;
  const humanSide = (player: Player | null | undefined) =>
    player != null && localSides.includes(player);
  const humanTurn = phase === 'turn' && humanSide(turn?.player);
  const humanPreRoll = phase === 'pre-roll' && humanSide(match?.toRoll);
  // A remote room whose socket is down takes no actions: the controls stay
  // in place but disabled until a snapshot proves the session current.
  const opponentGone =
    seated != null &&
    seated.connection.status === 'open' &&
    !seated.connection.error &&
    seated.connection.roomStatus === 'playing' &&
    !seated.connection.opponentPresent;
  /** Give up on a room whose opponent left: drop the seat, back to setup. */
  function abandonGame(): void {
    if (roomId) {
      clearSeat(roomId);
    }
    navigate('/');
  }
  const remoteBlocked = seated != null && seated.connection.status !== 'open';
  // A takeback can land while the engine thinks: the moment the decision is
  // the human's again, the stale in-flight think is no longer worth showing.
  const thinking =
    vsComputer && opponentState.thinking && !humanTurn && !humanPreRoll;
  /** Whose decision the moment is, for the active-chip highlight. */
  const actor: Player | null =
    phase === 'turn'
      ? (turn?.player ?? null)
      : phase === 'pre-roll'
        ? (match?.toRoll ?? null)
        : phase === 'cube-offered' && match?.toRoll
          ? opponent(match.toRoll)
          : phase === 'resign-offered' && match?.pendingResignation
            ? opponent(match.pendingResignation.by)
            : null;
  useTurnTitle(
    seated != null &&
      seated.connection.roomStatus === 'playing' &&
      actor === seated.side,
  );

  /** "Play a friend online": make a room, keep the White seat, open its URL. */
  async function createOnlineGame(): Promise<void> {
    rememberSetupChoice(setup.difficulty, setup.length);
    rememberMatchStarted();
    setCreateError(false);
    setCreating(true);
    try {
      const { roomId: newRoom, seatToken } = await remote.api.createRoom(
        setup.length,
        moveSeconds,
      );
      writeSeat(newRoom, { side: 'white', token: seatToken });
      navigate(`/play/${newRoom}`);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  }

  function start(mode: PlayMode): void {
    // Starting a match counts as "has played before" (ticket 33): the next
    // visit opens on this difficulty and length, not the novice defaults.
    rememberSetupChoice(setup.difficulty, setup.length);
    // It also advances the first-run window (ticket 31): once a newcomer has
    // played their first few matches, Tutor mode stops defaulting on.
    rememberMatchStarted();
    setSetup((current) => ({ ...current, mode }));
    if (mode !== 'computer') {
      // Tutor mode is live analysis of the player's own game against the
      // engine; a hot-seat match switches it off before the match starts so
      // the fresh game is never marked tutor-assisted.
      setTutorOn(false);
      tutorRef.current?.dispose();
      tutorRef.current = null;
    }
    const money = setup.gameType === 'money';
    persistence.begin({
      mode,
      difficulty: setup.difficulty,
      // A money session has no target: store 0 so the config reads as money.
      length: money ? 0 : setup.length,
      gameType: setup.gameType,
    });
    store.dispatch({ type: 'start', length: setup.length, money });
  }

  /** Pick a stored in-progress match back up exactly where it stood. */
  function resume(stored: StoredMatch): void {
    // A remote row resumes in its room; a local board cannot play it.
    if (stored.config.mode === 'remote') {
      if (typeof stored.config.roomId === 'string') {
        navigate(`/play/${stored.config.roomId}`);
      }
      return;
    }
    if (!stored.state) {
      return;
    }
    persistence.adopt(stored);
    setSetup(setupFromConfig(stored.config));
    setStore(createPlayStore({ match: stored.state }));
  }

  // Arriving from Analyze's "Resume": pick the named match up as soon as
  // storage has delivered it, once, and only before anything else starts.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resume is recreated per render; the ref guards re-runs
  useEffect(() => {
    if (!resumeMatchId || autoResumed.current || match) {
      return;
    }
    const stored = persistence.resumable.find(
      (row) => row.id === resumeMatchId,
    );
    if (stored) {
      autoResumed.current = true;
      resume(stored);
    }
  }, [resumeMatchId, persistence.resumable, match]);

  function retryEngine(): void {
    // A stuck load or a failed boot needs a clean slate: drop the worker
    // (its boot promise may be cached-rejected) so initialize builds a fresh
    // one. A ready engine with only a transient opponent error keeps its
    // worker and just re-asks the opponent.
    if (engineStatus === 'loading' || engineStatus === 'error') {
      engine.dispose();
    }
    engine.initialize().catch(() => {});
    opponentRef.current?.retry();
  }

  // Changing a picker also counts as "has played before" (ticket 33): the
  // user has expressed a choice, so it is remembered and wins from now on.
  const chooseDifficulty = (difficulty: Difficulty): void => {
    rememberSetupChoice(difficulty, setup.length);
    setSetup((current) => ({ ...current, difficulty }));
  };
  const chooseLength = (length: number): void => {
    rememberSetupChoice(setup.difficulty, length);
    setSetup((current) => ({ ...current, length }));
  };
  const chooseGameType = (gameType: GameType): void => {
    setSetup((current) => ({ ...current, gameType }));
  };

  const setupPickers = (
    <>
      <DifficultyPicker value={setup.difficulty} onChange={chooseDifficulty} />
      <GameTypePicker
        value={setup.gameType ?? 'match'}
        onChange={chooseGameType}
      />
      {setup.gameType === 'money' ? (
        <p className="setting-switch-hint">{MONEY_HINT}</p>
      ) : (
        <LengthPicker value={setup.length} onChange={chooseLength} />
      )}
    </>
  );

  const startButtons = (
    primaryLabel: string,
    primaryMode: PlayMode,
    online = false,
  ) => {
    const otherMode: PlayMode =
      primaryMode === 'computer' ? 'hotseat' : 'computer';
    return (
      <>
        {online && (
          <>
            <button
              type="button"
              className="play-button play-button--online"
              disabled={creating || setup.gameType === 'money'}
              onClick={() => {
                void createOnlineGame();
              }}
            >
              Play a friend online
            </button>
            {setup.gameType !== 'money' && (
              <div className="online-options">
                <NameField
                  initial={readPlayerName()}
                  onChange={writePlayerName}
                />
                <MoveTimerField
                  value={moveSeconds}
                  onChange={(seconds) => {
                    setMoveSeconds(seconds);
                    writeMoveSeconds(seconds);
                  }}
                />
              </div>
            )}
            {setup.gameType === 'money' && (
              <p className="setting-switch-hint">
                Online play is match play only.
              </p>
            )}
          </>
        )}
        <button
          type="button"
          className="play-button play-button--primary"
          onClick={() => start(primaryMode)}
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          className="play-button play-button--quiet"
          onClick={() => start(otherMode)}
        >
          {otherMode === 'computer' ? 'Play vs computer' : 'Hot-seat match'}
        </button>
      </>
    );
  };

  /** The newest in-progress match on offer to pick back up (reload safety). */
  const resumeCandidate = persistence.resumable[0] ?? null;

  // A remote row resumes by returning to its room, never into a local board.
  const remoteResume =
    resumeCandidate?.config.mode === 'remote' && resumeCandidate.config.roomId
      ? resumeCandidate.config.roomId
      : null;

  const resumePrompt = resumeCandidate && (
    <div className="resume-note">
      <p className="resume-text">
        {remoteResume ? 'An online match is waiting' : 'A match is waiting'}:{' '}
        {storedMatchName(resumeCandidate)}, White {resumeCandidate.score.white}{' '}
        · Black {resumeCandidate.score.black}.
      </p>
      <button
        type="button"
        className="play-button play-button--primary"
        onClick={() =>
          remoteResume
            ? navigate(`/play/${remoteResume}`)
            : resume(resumeCandidate)
        }
      >
        {remoteResume ? 'Return to online match' : 'Resume match'}
      </button>
    </div>
  );

  /** The in-progress stored row for this room, reviewable after it expires. */
  const roomRow = roomId
    ? (persistence.resumable.find((row) => row.config.roomId === roomId) ??
      null)
    : null;

  const setupCard = (
    title: string,
    primaryLabel: string,
    primaryMode: PlayMode,
  ) => (
    <div className="play-banner">
      <div className="setup-card">
        <p className="setup-title">{title}</p>
        {resumePrompt}
        <OnlineGames api={remote.api} />
        {setupPickers}
        <div className="setting-switches">
          <SettingSwitch
            label="Tutor mode"
            hint={TUTOR_HINT}
            on={tutorOn}
            onChange={setTutorOn}
          />
        </div>
        {startButtons(primaryLabel, primaryMode, true)}
        {createError && (
          <p className="dialog-note" role="alert">
            Couldn't create the game. Check your connection and try again.
          </p>
        )}
        {/* The preference controls live in Settings (ticket 25); one quiet
            pointer keeps them discoverable from here. */}
        <Link className="setup-settings-link" to="/settings">
          Board style, auto-play and more in Settings
        </Link>
        <EngineNote
          status={engineStatus}
          opponentError={opponentState.error}
          onRetry={retryEngine}
        />
      </div>
    </div>
  );

  /** Between games: the result, the standing, and the way onward. */
  const gameOverCard = (current: MatchState) => {
    const nextIsCrawford =
      !current.money &&
      !current.crawfordPlayed &&
      (current.score.white === current.length - 1 ||
        current.score.black === current.length - 1);
    return (
      <PlayDialog labelledBy={dialogTitleId} describedBy={dialogDescId}>
        <p className="setup-title" id={dialogTitleId}>
          {current.gameResult ? gameEndText(current.gameResult) : ''}
        </p>
        <p className="score-line" id={dialogDescId}>
          White {current.score.white} · Black {current.score.black}
          {current.money ? ' — running total' : ` — first to ${current.length}`}
        </p>
        {nextIsCrawford && (
          <p className="dialog-note">
            Next is the Crawford game — no doubling.
          </p>
        )}
        <button
          type="button"
          className="play-button play-button--primary"
          disabled={remoteBlocked}
          onClick={() => store.dispatch({ type: 'next-game' })}
        >
          Next game
        </button>
      </PlayDialog>
    );
  };

  /** The match is decided: the summary, every game, and a fresh start. */
  const matchOverCard = (current: MatchState) => {
    const winner = current.winner ?? 'white';
    return (
      <PlayDialog labelledBy={dialogTitleId}>
        <p className="setup-title" id={dialogTitleId}>
          {playerName(winner)} wins the match {current.score[winner]}–
          {current.score[opponent(winner)]}
        </p>
        <ol className="match-games">
          {current.games.map((completed, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: games are an append-only sequence
              key={index}
            >
              {playerName(completed.result.winner)} +{completed.result.points}
              {' — '}
              {completed.result.end === 'pass'
                ? 'double passed'
                : completed.result.end === 'resignation'
                  ? `resigned ${KIND_TEXT[completed.result.kind]}`
                  : KIND_TEXT[completed.result.kind]}
              {completed.crawford ? ' (Crawford)' : ''}
            </li>
          ))}
        </ol>
        {setup.mode !== 'remote' && setupPickers}
        {setup.mode !== 'remote' && startButtons('New match', setup.mode)}
        {setup.mode === 'remote' ? (
          <Link className="play-button play-button--quiet" to="/">
            Back to Play
          </Link>
        ) : (
          <EngineNote
            status={engineStatus}
            opponentError={opponentState.error}
            onRetry={retryEngine}
          />
        )}
      </PlayDialog>
    );
  };

  /** The opponent doubled: the user's take-or-pass decision. */
  const cubeDialog = (current: MatchState) => {
    const doubler = current.toRoll ?? 'white';
    const stake = current.cube.value;
    // No onDismiss: a doubled player must take or pass, so Escape would have no
    // non-destructive default to fall back to.
    return (
      <PlayDialog labelledBy={dialogTitleId} describedBy={dialogDescId}>
        <p className="setup-title" id={dialogTitleId}>
          {playerName(doubler)} doubles to {stake * 2}
        </p>
        <p className="dialog-note" id={dialogDescId}>
          Take to play on for {points(stake * 2)}, or pass to concede{' '}
          {points(stake)}.
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="play-button play-button--primary"
            disabled={remoteBlocked}
            onClick={() => store.dispatch({ type: 'take' })}
          >
            Take
          </button>
          <button
            type="button"
            className="play-button"
            disabled={remoteBlocked}
            onClick={() => store.dispatch({ type: 'pass' })}
          >
            Pass
          </button>
        </div>
      </PlayDialog>
    );
  };

  /** The opponent offered to resign: the user accepts or declines. */
  const resignDialog = (
    current: MatchState,
    pending: { by: Player; kind: GameEndKind },
  ) => (
    // Escape declines (play on): the non-destructive answer to a resignation
    // offer, so a keyboard user can wave it away without touching the mouse.
    <PlayDialog
      labelledBy={dialogTitleId}
      describedBy={dialogDescId}
      onDismiss={() => store.dispatch({ type: 'decline-resign' })}
    >
      <p className="setup-title" id={dialogTitleId}>
        {playerName(pending.by)} offers to resign a {KIND_TEXT[pending.kind]}
      </p>
      <p className="dialog-note" id={dialogDescId}>
        Accept to win {points(KIND_POINTS[pending.kind] * current.cube.value)},
        or decline to play on.
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          className="play-button play-button--primary"
          disabled={remoteBlocked}
          onClick={() => store.dispatch({ type: 'accept-resign' })}
        >
          Accept
        </button>
        <button
          type="button"
          className="play-button"
          disabled={remoteBlocked}
          onClick={() => store.dispatch({ type: 'decline-resign' })}
        >
          Decline
        </button>
      </div>
    </PlayDialog>
  );

  const resignButton = match && (
    <button
      type="button"
      className="play-button play-button--quiet"
      disabled={remoteBlocked}
      onClick={() => setResignOpen(true)}
    >
      Resign…
    </button>
  );

  const resignPicker = match && (
    <div className="play-controls">
      <span className="resign-label">Resign:</span>
      {(['single', 'gammon', 'backgammon'] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          className="play-button"
          disabled={remoteBlocked}
          onClick={() => store.dispatch({ type: 'resign', kind })}
        >
          {RESIGN_LABEL[kind]}
          {` — ${points(KIND_POINTS[kind] * match.cube.value)}`}
        </button>
      ))}
      <button
        type="button"
        className="play-button play-button--quiet"
        onClick={() => setResignOpen(false)}
      >
        Cancel
      </button>
    </div>
  );

  const status = statusText(match ?? null, thinking, setup.mode);
  const xgid = currentXgid(match ?? null);

  return (
    <section className="play-area">
      <h1>Play</h1>
      {/* Ticket 24: portrait phones see a one-line nudge toward the play
          orientation; CSS keeps it off every other viewport. */}
      <p className="rotate-hint">
        Turn your phone sideways for a bigger board.
      </p>
      <PlayHud
        actor={actor}
        board={board}
        match={match ?? null}
        status={status}
        declineNote={declineNote}
        xgid={xgid}
        vsComputer={vsComputer}
        difficulty={setup.difficulty}
        thinking={thinking}
        tutorOn={tutorOn}
        onTutorChange={setTutorOn}
        autoRollMode={autoRollMode}
        onAutoRollChange={handleAutoRollChange}
        connection={seated?.connection ?? null}
        privateLink={seated?.privateLink ?? null}
        onAbandon={
          opponentGone ||
          seated?.connection.forfeitBy ||
          seated?.connection.cancelledBy
            ? abandonGame
            : null
        }
        localSide={seated?.side ?? null}
      />

      {match && vsComputer && tutorOn && (
        <div className="tutor-strip">
          <EvalBar state={tutorState} />
          {tutorState?.hint && (
            <p className="tutor-note" role="note" aria-label="Hint">
              Best: {tutorState.hint.moveText}
            </p>
          )}
          {tutorState?.feedback && (
            <FeedbackNote feedback={tutorState.feedback} />
          )}
          {canTakeback(match, 'white') && (
            <button
              type="button"
              className="play-button play-button--quiet"
              onClick={() =>
                store.dispatch({ type: 'takeback', player: 'white' })
              }
            >
              Take back
            </button>
          )}
        </div>
      )}

      {/* Board first, turn controls after: the DOM (and tab) order runs
          board origins → destinations → controls. During a match the
          controls sit beside the board at desktop width and wrap below it
          at the HUD-wrap breakpoint (board.css). */}
      <div className="play-layout">
        <div className="play-board">
          <Board
            game={game}
            selected={selected}
            onSelect={setSelected}
            onMove={(from, die) =>
              store.dispatch({ type: 'movement', from, die })
            }
            cube={match ? { ...match.cube, outOfPlay: match.crawford } : null}
            interactive={humanTurn && !remoteBlocked}
            perspective={localSide ?? 'white'}
          />
          {roomView && (
            <RemotePanel
              view={roomView}
              matchStarted={match != null}
              localRow={roomRow}
              onDiscard={() => {
                if (roomRow) {
                  void storage.delete(roomRow.id).then(() => navigate('/'));
                }
              }}
            />
          )}
          {!match &&
            !roomView &&
            setupCard('Play against the computer', 'Play as White', 'computer')}
          {match && phase === 'game-over' && gameOverCard(match)}
          {match && phase === 'match-over' && matchOverCard(match)}
          {match &&
            phase === 'cube-offered' &&
            match.toRoll &&
            humanSide(opponent(match.toRoll)) &&
            cubeDialog(match)}
          {match &&
            phase === 'resign-offered' &&
            match.pendingResignation &&
            humanSide(opponent(match.pendingResignation.by)) &&
            resignDialog(match, match.pendingResignation)}
        </div>

        {match && (
          <div className="play-side">
            {humanTurn && resignOpen && resignPicker}
            {humanTurn && !resignOpen && (
              <div className="play-controls">
                <button
                  type="button"
                  className="play-button"
                  disabled={remoteBlocked || !canUndo(game)}
                  onClick={() => store.dispatch({ type: 'undo' })}
                >
                  Undo
                </button>
                {dance ? (
                  <button
                    type="button"
                    className="play-button play-button--primary"
                    disabled={remoteBlocked}
                    onClick={() => store.dispatch({ type: 'commit' })}
                  >
                    Continue
                  </button>
                ) : (
                  <>
                    {forced && (
                      <button
                        type="button"
                        className="play-button play-button--primary"
                        disabled={remoteBlocked}
                        onClick={() => store.dispatch({ type: 'forced' })}
                      >
                        Play forced play
                      </button>
                    )}
                    <button
                      type="button"
                      className={`play-button ${forced ? '' : 'play-button--primary'}`}
                      disabled={remoteBlocked || !canCommit(game)}
                      onClick={() => store.dispatch({ type: 'commit' })}
                    >
                      Commit play
                    </button>
                    {vsComputer && tutorOn && (
                      <button
                        type="button"
                        className="play-button"
                        disabled={
                          (tutorState?.hintPending ?? false) ||
                          tutorState?.hint != null
                        }
                        onClick={() => tutorRef.current?.requestHint()}
                      >
                        Hint
                      </button>
                    )}
                  </>
                )}
                {resignButton}
              </div>
            )}
            {humanPreRoll && resignOpen && resignPicker}
            {humanPreRoll && !resignOpen && canDouble(match) && (
              <div className="play-controls">
                <button
                  type="button"
                  className="play-button"
                  disabled={remoteBlocked}
                  onClick={() => store.dispatch({ type: 'double' })}
                >
                  Double to {match.cube.value * 2}
                </button>
                <button
                  type="button"
                  className="play-button play-button--primary"
                  disabled={remoteBlocked}
                  onClick={() => store.dispatch({ type: 'roll' })}
                >
                  Roll
                </button>
                {resignButton}
              </div>
            )}
            {!humanTurn &&
              !humanPreRoll &&
              phase !== 'game-over' &&
              phase !== 'match-over' &&
              setup.mode !== 'remote' && (
                <div className="play-controls play-controls--note">
                  <EngineNote
                    status={engineStatus}
                    opponentError={opponentState.error}
                    onRetry={retryEngine}
                  />
                </div>
              )}
            {autopilotAvailable && (
              <div className="play-controls play-controls--autopilot">
                <button
                  type="button"
                  className="play-button autopilot-button"
                  aria-pressed={autopilotOn}
                  onClick={() => {
                    const autopilot = autopilotRef.current;
                    if (!autopilot) {
                      return;
                    }
                    if (autopilotOn) {
                      autopilot.stop();
                    } else {
                      autopilot.start();
                    }
                  }}
                >
                  {autopilotOn && (
                    <span className="autopilot-dot" aria-hidden="true" />
                  )}
                  Finish race
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
