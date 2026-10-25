/**
 * The Learn area (ticket 32): a browsable glossary of the words the app uses,
 * written for players. The same definitions power the inline tooltips
 * (GlossaryTerm) across Play, Analyze and Puzzles, so a term never has to be
 * looked up outside the app. Ticket 30 will add a how-to-play primer beside
 * the glossary in this same area.
 */

import { GLOSSARY_CATEGORIES, glossaryByCategory } from '../ui/glossary';
import './learn.css';

export function Learn() {
  return (
    <section className="learn-area">
      <h1>Learn</h1>
      <p className="learn-intro">
        The words the app uses, in plain language. Anywhere a term is
        underlined, point at it, tab to it, or tap it for the short version —
        the full set lives here.
      </p>

      <section className="glossary" aria-label="Glossary">
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
              <h2>{category.label}</h2>
              <p className="glossary-group-blurb">{category.blurb}</p>
            </header>
            <dl className="glossary-list">
              {glossaryByCategory(category.id).map((entry) => (
                <div key={entry.id} className="glossary-entry" id={entry.id}>
                  <dt>
                    {/* A heading as well as a term, so the list is navigable. */}
                    <h3 className="glossary-term-name">{entry.term}</h3>
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
