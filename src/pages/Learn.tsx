/**
 * The Learn area: the newcomer's on-ramp. Ticket 30's how-to-play primer leads
 * — the goal, movement, hitting, bearing off and the cube — followed by ticket
 * 32's browsable glossary of the words the app uses. The same definitions
 * power the inline tooltips (GlossaryTerm) across Play, Analyze and Puzzles, so
 * a term never has to be looked up outside the app. Opening this area counts as
 * having seen the primer, so the first-run nudge does not return.
 */

import { useEffect } from 'react';
import { markPrimerSeen } from '../play/settings';
import { GLOSSARY_CATEGORIES, glossaryByCategory } from '../ui/glossary';
import { HowToPlay } from './HowToPlay';
import './learn.css';

export function Learn() {
  // Reaching the Learn area is reaching the primer: retire the first-run nudge.
  useEffect(() => {
    markPrimerSeen();
  }, []);

  return (
    <section className="learn-area">
      <h1>Learn</h1>
      <p className="learn-intro">
        New to the game? The primer below walks you through how backgammon is
        played. After it, a glossary gives the plain-language meaning of every
        word the app uses — the same definitions you get by pointing at any
        underlined term as you play.
      </p>

      <HowToPlay />

      <section className="glossary" aria-label="Glossary">
        <header className="primer-header">
          <svg
            className="primer-point"
            width="12"
            height="14"
            viewBox="0 0 12 14"
            aria-hidden="true"
          >
            <path d="M0 14h12L6 0z" />
          </svg>
          <h2>Glossary</h2>
          <p className="primer-blurb">Every word the app uses, defined.</p>
        </header>
        {GLOSSARY_CATEGORIES.map((category) => (
          <section key={category.id} className="glossary-group">
            <header className="glossary-group-header">
              <svg
                className="glossary-point"
                width="12"
                height="14"
                viewBox="0 0 12 14"
                aria-hidden="true"
              >
                <path d="M0 14h12L6 0z" />
              </svg>
              <h3>{category.label}</h3>
              <p className="glossary-group-blurb">{category.blurb}</p>
            </header>
            <dl className="glossary-list">
              {glossaryByCategory(category.id).map((entry) => (
                <div key={entry.id} className="glossary-entry" id={entry.id}>
                  <dt>
                    {/* A heading as well as a term, so the list is navigable. */}
                    <h4 className="glossary-term-name">{entry.term}</h4>
                  </dt>
                  <dd className="glossary-def">{entry.long}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </section>
    </section>
  );
}
