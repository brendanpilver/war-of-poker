-- The 3-Hand PLO Reality Check became the 10-Hand Short Stack PLO Challenge.
--
-- Only one thing in the schema knew how long the quiz was: the score bound on
-- `subscribers`. Everything else -- the events log, the attribution columns,
-- the offer ids -- is length-agnostic and needs no change. Run this before
-- deploying the challenge, or every completion with a score above 3 is
-- rejected at the database and the subscriber is lost.

alter table subscribers drop constraint if exists subscribers_quiz_score_check;

alter table subscribers
  add constraint subscribers_quiz_score_check
  check (quiz_score is null or (quiz_score between 0 and 10));
