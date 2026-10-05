# Kannada Buddy UX and UI audit

Audit date: 5 October 2026. Source baseline: `207428d`.

Reading this as: a mobile learning app for Bengaluru newcomers, with a calm green-and-paper identity and a practical, accessible interface.

This is a source-grounded audit of all active routes and their shared components. It does not claim screenshots, browser observations, measured performance, linguistic review, or accessibility certification. Browser verification of the implemented fixes belongs to the implementation validation report. Findings describe the baseline, not necessarily the final implementation.

## Design direction and preservation

Apply the invoked `taste-skill:design-taste-frontend` redesign audit and preservation protocol. Its landing-page patterns do not fit a lesson player or dense admin queue; do not add marketing heroes, ornamental motion, or a replacement design system.

Use `DESIGN_VARIANCE: 3`, `MOTION_INTENSITY: 2`, `VISUAL_DENSITY: 5`. Keep existing routes and primary navigation labels. Retain the green accent (`#183a37`), paper background (`#f7f3e8`), locally served Noto Sans Kannada, legible script line heights, 44 px action targets, source attribution, and explicit draft disclosures. Evolve typography, spacing, navigation, and feedback first. Preserve storage keys and progress.

The baseline has 8 px panels/buttons, 12 px mode cards, and pill metadata. Make that an explicit small radius scale rather than adding new shapes. English uses the system sans stack; its first entry, Inter, is not actually bundled. Do not install a font or animation library just for decoration. A single maintained icon family is appropriate for navigation, subject to checking dependencies first.

## Information architecture

| Route | Baseline purpose | Finding |
| --- | --- | --- |
| `/`, `/today` | Onboarding, then adaptive lesson | Today starts a lesson immediately; `/today` is an alias. |
| `/travel` | Same adaptive lesson component | Practice duplicates Today despite being a separate primary destination. |
| `/phrasebook` | Selected 100-phrase course search | Broader reference library has no inbound app link at baseline. |
| `/library` | Broader reference search | Source categories and review statuses are separate dimensions; labels need clarification. |
| `/review` | Active-deck progress and history | Honest evidence definitions exist, but dense explanations obscure the next action. |
| `/settings` | Mode, content, romanization, length, backup | Good local backup confirmation; saving settings has no storage-failure feedback. |
| `/admin` | Local draft review | Queue and decision filters overlap; approval has no publishing handoff. |
| `/sources` | Source licenses and attribution | Must match actual availability and review behavior after publishing changes. |

All pages inherit a fixed five-item bottom bar. There is no skip link. Document titles share the same generic app metadata, so browser history does not distinguish destinations. Preserve routes while adding route-specific titles if practical; no SEO migration or route removal is needed.

## Prioritized findings

### P1: fix in the current change

1. **Navigation uses initials rather than recognizable icons.** `components/BottomNav.tsx` renders `T`, `P`, `S`, `G`, and a gear. The letters add a second decoding task, and the active destination is not exposed with `aria-current`. Use a single icon family plus the existing visible labels; decorative icons remain hidden from assistive technology. Add `aria-current="page"` only to the active item, with an obvious visual active state that does not rely on color alone. Match route boundaries rather than arbitrary string prefixes.

2. **Mobile navigation ignores the device safe area.** `app/globals.css` fixes the bar to the bottom with a 72 px inner height and static content padding. It has no `env(safe-area-inset-bottom)`. Reserve that inset in both the bar and the content so the last action stays reachable on installed iOS layouts. Verify 320 px, 390 px, landscape, and keyboard-visible layouts.

3. **Zoom is restricted.** `app/layout.tsx` sets `maximumScale: 1`. Remove it. Check content at 200% zoom and large text without clipping controls or Kannada marks.

4. **Oversized headers displace the task.** The global `h1` in `app/globals.css` uses `clamp(2.8rem, 4rem, 4.6rem)`: because its middle value is a fixed 4 rem, it never responds to viewport width. Its `max-width: 10ch` causes many-line headers. Onboarding reserves 26 dvh above two 220 px mode cards. Use compact responsive titles on search/settings/progress/admin, remove unnecessary hero height, and let content determine card height. Keep the lesson's Kannada answer prominent rather than shrinking useful learning content.

5. **The library is effectively orphaned.** No baseline app component links to `/library`. Add a clear link from course search, identifying the selected course versus the broader reference library. Retain both routes and the Search navigation label. Do not silently change a 100-phrase course into an unrestricted reference dump.

6. **Admin approval does not publish content.** `components/AdminPhraseCard.tsx` changes browser-local overrides; the course and public reference exports do not read those decisions. Provide an explicit export of review decisions and a validated repository import that updates deployed content. The interface must distinguish a local decision, an exported decision, and published content. Keep learning progress local; no learner account or cloud sync is required. Do not describe an exported file as already published, or an editorial decision as a native-speaker review.

7. **Admin filters mix different dimensions.** `app/admin/page.tsx` combines `automation.reviewQueue` with `phrase.status` in one filter strip. Approving a phrase changes status but leaves its automation queue intact, so approved/rejected items remain in pending queues. Separate pending queue/risk from decision state, exclude resolved items from pending counts, and expose a selected state with `aria-pressed` or a labeled select. Include a useful empty state and accessible action feedback. Keep immutable provenance intact.

8. **Published content invalidates hard-coded descriptions.** `app/phrasebook/page.tsx` hard-codes 100 total, 16 native reviewed, and 84 drafts. `app/library/page.tsx` and admin use static draft counts despite local decisions. Compute current counts from the displayed source and describe what each count covers. Publicly approved imports must not retain misleading "locally approved" wording or automatically gain a native-review badge/audio.

### P2: include where the affected components are already changing

9. **Categories are exclusive in data, not in everyday meaning.** `data/course-scenarios.ts` assigns each selected phrase one editorial scenario; `lib/search.ts` filters a single source `category` using exact equality. Food, shopping/payment, transport, and directions naturally overlap. Keep one primary placement for predictable counts; label it Situation in the course and Source category in the reference library. Explain that search crosses these boundaries. A source category should not become a second, competing course taxonomy. Multi-tag navigation is a future option, not a requirement for this fix.

10. **Progress tiles imply incompatible partitions.** `app/review/page.tsx` puts new, learning, retained-speaking, and due-now in one row. Due work overlaps learning and can include script checks, while the other three describe phrase state. Group phrase-state metrics together and show due work as a separate action/count. Explain retention in expandable help and preserve the self-report limitation. Make the empty state point to the first lesson. Do not fabricate mastery percentages.

11. **Today and Practice are indistinguishable.** `app/page.tsx` and `app/travel/page.tsx` render the same `LearningHome`. Give Today a brief daily summary with an explicit lesson action and Practice the player, or document another concrete distinction. Keep primary labels/routes stable. This is a behavior change: test onboarding, due work, caught-up state, and preservation of an in-progress session before introducing it.

12. **Keyboard focus can disappear during practice.** `ConceptPractice` swaps the reveal button for the answer and remounts the next card without focus transfer; `OrthographyPractice` similarly replaces study/check/retry controls. Focus the new stage heading or first meaningful control, with a visible focus treatment and concise announcement. Do not put the entire card in a live region, which would repeatedly announce long Kannada passages. Test Reveal, speaking rating, reading help, next item, correction, and completion by keyboard.

13. **Focus and link affordances are incomplete.** `app/globals.css` has custom focus rules for selected classes but omits `.select`, native file input, summary, and inline links. Browser focus defaults are not deliberately suppressed for those controls, but presentation is inconsistent. Add a coherent universal `:focus-visible` treatment, underline inline links, and provide a skip-to-content link. Keep buttons and navigation labels visually distinct from body copy.

14. **Dark-mode and reduced-motion support are absent.** The stylesheet has no `prefers-color-scheme` or `prefers-reduced-motion` handling. Add semantic dark tokens and convert hard-coded light surfaces, preserving warning contrast and brand hierarchy. Honor reduced motion for the existing quick-link translation. Avoid adding animation dependencies. Check both themes with real browser screenshots before claiming visual validation.

15. **Audio feedback is not announced.** `components/AudioButton.tsx` renders its message as an unannotated span. Add a polite status region and a recognizable play/audio icon with an accessible label. Multiple reference cards currently use the generic name Play; name them by phrase where possible. Keep the distinction between packaged reviewed audio and unreviewed device speech.

16. **Storage failures have no recoverable UI.** `savePreferences` and `updatePhraseOverride` write directly to localStorage. Settings, onboarding, ratings, and admin actions may throw when storage is denied or full. Catch failures at the interaction boundary, keep the current action available, and report that the change could not be saved. The settings success message must follow an actual successful write. LocalBackup already provides useful validation, preview, rollback, and status/error messages; preserve these.

17. **Some Kannada markup lacks its language/font.** The main phrase in `AdminPhraseCard` uses `className="script"` without `lang="kn"`; source comparison paragraphs are correctly marked. Fix the main card and script field when editing the component. Older QuizCard/TravelPlayer also have this gap, but confirm whether they are used before broadening scope.

18. **Reference controls have ambiguous counts.** Library status counts are global, while results also filter by query and category; categories are gathered from all phrases. Either show counters for the active facet combination or label them as total status counts. Zero results should offer a clear reset or alternative search; avoid a filter that appears broken simply because another active filter removed all items.

## Positive patterns to preserve

- Locally served Kannada fonts and `lang="kn"` on active learner script content.
- Explicit speaking self-report and retention evidence definitions.
- Separate speaking/reading attempts, stable content IDs, and retention of disabled-deck history.
- Source comparison disclosures and attribution links; held material stays out of lessons.
- Accessible search labels, result status regions, pressed states in course and settings filters.
- A backup preview with explicit replacement warning, cancel action, and distinct error status.
- Device-only recorder wording and microphone-failure fallback.
- Full-document admin links for browser Basic authentication. Do not replace them with prefetched client navigation.

## Verification checklist for the implementation

Use isolated browser storage, never a personal browser profile. Capture before/after mobile screenshots for onboarding, course search, reference library, progress, settings, and a representative practice answer; inspect the admin review/export flow separately.

- Confirm all five navigation links have recognizable icons, unchanged labels/routes, correct active semantics, visible keyboard focus, and reachable bottom content with safe-area padding.
- Check 320 px and 390 px widths, desktop, landscape, 200% zoom, light/dark themes, and reduced motion. Confirm no horizontal page overflow and no Kannada clipping.
- Walk onboarding, settings, speaking-only, speaking-and-reading, correction, completion, and empty search with keyboard; observe focus after dynamic changes.
- Verify category and status combinations, pending/resolved queue counts, source disclosure, and empty states against actual data.
- Exercise local review, export, validated import, rebuild, and a fresh-browser public view. Reject malformed/unknown IDs and preserve provenance. Ensure a local edit or exported file alone does not claim successful publication.
- Test unavailable/full localStorage, unsupported audio, microphone denial, bad backup, and admin authentication. Confirm no false success message.
- Run all repository unit/integration/regression and browser tests, lint, typecheck, production build, and both content validators. Record real output. Measure performance if tooling is available; no Lighthouse score is claimed by this source audit.

Larger navigation experiments, multi-tag taxonomy, richer graphs, and cloud publishing can be deferred explicitly. They should not delay fixing broken navigation affordances, accessibility restrictions, and the requested review-to-publication path.

## Implementation disposition and skill preflight

The UI changes address findings 1-5 with Phosphor navigation icons, active semantics, safe-area padding, unrestricted zoom, a skip link, compact headings, and course/library links. Practice now provides a situation browser and an explicit adaptive-lesson action, rather than duplicating Today (finding 11). Scenario links preselect a validated situation; unknown values fall back to All.

The course shows dynamic counts and distinguishes native review from recorded admin review. The reference library filters locally merged content by public eligibility, explains its source-category axis and global status counters, and offers Clear filters. These address findings 8, 9, and 18. Semantic dark tokens, broad focus styling, underlined inline links, reduced-motion handling, and storage-error feedback in Settings/onboarding address findings 13, 14, and part of 16. The coordinator owns publishing, admin queues, lesson focus, audio feedback, and progress presentation; their final verification must be recorded separately.

Deferred product changes: multi-tag filtering is unnecessary for a one-primary-placement catalog; route/primary-label renaming is intentionally excluded by the preservation brief; extra graphs and cloud publishing introduce complexity the user did not request. Per-page SEO metadata is a future refinement because this change keeps URLs and content destinations stable. Storage-failure handling for individual lesson ratings remains a separate affected boundary unless explicitly included by the coordinator.

The skill preflight is applied in context:

- **Applicable:** preserve brand/routes; responsive task-first typography; copy clarity; restrained feedback motion; empty/error states; accessible real icon family; single CSS token system; safe viewport sizing; light/dark parity; reduced motion. Unit/integration tests cover behavioral changes; actual browser checks remain the coordinator's gate.
- **Not applicable:** AIDA conversion sections, marketing hero imagery, bento section variety, quote lengths, marquees, photo credits, stock avatars, decorative counters, cinematic GSAP choreography, and promotional headers. This is an existing educational product and review tool, not a landing page. Adding those patterns would weaken the task flow.
- **Deliberate product exception:** the existing lesson progress indicator communicates actual sequence completion; the skill's ban on decorative marketing comparison tracks does not apply. Educational warnings and source attribution may need longer text than a marketing sub-paragraph; retain their meaning and make dense explanations expandable where appropriate.
- **Unmeasured:** this source audit claims no Core Web Vitals or Lighthouse result. Bundle impact is constrained by individual Phosphor icon imports. Visual sign-off requires actual screenshots in both themes, mobile sizing, zoom, and keyboard testing.

Token contrast calculations found baseline terra text on paper at 4.07:1 and the gold focus outline on a light panel at 1.97:1. The implemented terra adjustment is 5.44:1 on paper; focus uses the green accent at 12.14:1 on the light panel and 9.29:1 in dark mode. These are calculated token-pair ratios, not a claim that every rendered control has passed an accessibility audit.

## Executed verification

The coordinator inspected real baseline mobile screenshots from the prior production build and final light/dark screenshots of onboarding, course search, reference library, progress, settings, Practice, an answer with Kannada script, and admin. The oversized onboarding header is reduced, icons and the active destination are visible, Kannada marks are legible, and dark surfaces remain consistent. Native publishing disclosure keeps empty export controls from displacing admin review queues.

Browser regressions passed across light/dark themes at 320, 390, and 1280 px for six public routes. Separate isolated checks at 390 px with root text size increased to 200% found no horizontal overflow on Settings, Practice, course search, and Progress; an 844×390 landscape Practice check also passed. This is enlarged-text verification, not a claim of exhaustive browser zoom/device testing. Viewport metadata permits pinch zoom. Safe-area behavior uses CSS environment insets; physical iOS home-indicator testing remains unperformed.

The browser matrix initially exposed a real 320 px Settings overflow caused by the native backup file input's minimum content width. Bounded grid tracks and a sized file input fix it without hiding controls. The publishing download test initially used a locator tied to text that disappears in edit mode; it now selects the actual editor controls and passes. One real CLI integration exceeded Vitest's default five seconds while a build and workers competed for resources. Those process-level tests have a bounded fifteen-second allowance with every assertion retained; the final full suite passed.

Final commands and actual outcomes:

| Command | Result |
| --- | --- |
| `pnpm test` | 183 tests passed across 25 files |
| `pnpm lint` | Passed, no warnings |
| `pnpm build` | Production build passed; 47 public URLs precached |
| `pnpm exec tsc --noEmit` | Passed after the production build |
| `pnpm content:validate` | 40 calibration drafts validated |
| `pnpm content:validate-all` | All 621 source drafts validated |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… pnpm test:e2e` | 11 browser tests passed, including auth with active service worker, backups, persistence, navigation/themes, and an actual reviewed download through CLI check/apply into a temporary artifact |

Published-content integration tests exercise held promotions, core edits, stable IDs, source drift, attribution, admin/native distinctions, and removal of stale audio when Kannada changes. No test approvals were added to the tracked artifact: `data/published-phrases.json` remains empty. Local edited wording cannot inherit or fabricate a published-review badge. Reviewer identity is explicitly a public display name. Export attestations reset if the candidate content changes.

Lighthouse was executed against the final production `/phrasebook` on localhost, using isolated headless Chrome and default mobile simulation. Final scores: performance 97, accessibility 100, best practices 100, SEO 100. FCP 1.2 s, LCP 2.5 s, total blocking time 40 ms, CLS 0. These are one-run laboratory measurements, not field Core Web Vitals or accessibility certification; no INP measurement is claimed. The initial run found a missing favicon request; metadata now references the existing SVG icon, and the browser test verifies HTTP 200. The score variation between runs is not attributed entirely to that icon fix.

Before/after PNGs and Lighthouse JSON/HTML are local inspection artifacts in `/tmp/kannada-ux-before`, `/tmp/kannada-ux-after`, and `/tmp/kannada-ux-lighthouse-final.report.*`; they are not committed or guaranteed to survive temporary-file cleanup. Five independent review lenses covered security/privacy, maintainability, correctness, testing/regression, and UX/accessibility. Findings were fixed and the affected changes re-reviewed; reviewers did not approve their own authored fixes.

Remaining limits: individual lesson-rating storage-failure recovery, route-specific page titles, multi-tag browsing, physical-device safe-area checks, and publishing withdrawals are future work. Due work currently counts speaking reviews and script checks, while phrase-reading deadlines remain visible separately in history. These limits do not imply server synchronization; learner progress remains entirely local.
