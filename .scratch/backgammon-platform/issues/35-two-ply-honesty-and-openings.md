# 35: 2-ply honesty and opening handling

**What to build:** The analyzer is honest about its confidence and stops "correcting" well-known openings. Analysis is labelled as a 2-ply evaluation (deeper on demand), not a rollout; puzzles are only kept where 2-ply and a deeper check agree on the best play; and contested opening plays aren't flagged as errors on thin 2-ply margins.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The review and Tutor UI make clear the evaluation is 2-ply (deeper on demand), not a rollout
- [ ] Bundled and generated puzzles whose top play flips between 2-ply and a deeper check are excluded
- [ ] Opening decisions within a small margin are not classified as errors or blunders
- [ ] Full gauntlet green
