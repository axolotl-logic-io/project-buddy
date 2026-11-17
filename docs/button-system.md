# Button system

Letterpress is the site's shared action language. The approved design uses Source Serif 4 labels, 2 px corners, a 1 px keyline and flat resting surfaces. A framed action gains a subtle warm shadow on pointer hover. Pressing replaces the outer shadow with a shallow inset. Targets remain at least 44 px; text can wrap at 320 px.

## Color vocabulary

| Material | Purpose | Shared role |
| --- | --- | --- |
| Brass | The main commitment in a form or page, such as Save, Send or Start | Button primary |
| Paper | Another action, such as Cancel, Copy or Stop | Button secondary |
| Ink | A quiet action, such as Edit, Add or Undo | Button quiet |
| Sealing wax | Confirmation of deletion or ending access | Button danger |
| Sealing wax text | A quiet trigger that opens a destructive confirmation | Button quiet-danger |
| Graphite | An unavailable action, with its disabled state | Native disabled |

These names describe design decisions, not new product labels. Brass is burnished ochre on Ivory Vellum and pale metal on Soot & Brass and Espresso Leather. Ink becomes warm ivory on dark surfaces. The action palette has its own semantic tokens, so changing a button never recolors unrelated prose or notices. Danger continues to use the existing danger and on-danger tokens.

## Use shared controls

Use `Button` for actions and `Button asChild` for a navigation link that needs action emphasis. Keep the child's anchor and destination. A Button defaults to `type="button"`; a form explicitly requests `type="submit"`. Its class name adds layout, not another color, font, radius or shadow.

Use one primary action per form where possible. Stopping a reply or spell is a secondary action with a square icon, not a destructive action. Reversible retirement and abandonment do not need the filled danger treatment. Destructive confirmation includes an explicit label and removal icon; its cancel button receives initial focus. A disabled control never gains a hover shadow. Set `aria-busy` when an action is running and retain the form's existing live status wording. Busy actions have a dashed boundary and progress mark without requiring animation. An unavailable sibling action is disabled, not busy.

Labels are 16 px semibold Source Serif 4. Icons align beside labels with an 8 px gap. Icon-only actions have accessible names and square 44 px targets. Quiet text actions have a resting underline; icon-only controls do not. A dashed keyboard outline stays independent from selection, hover and pressed feedback. Hover does not enlarge or move the target. Touch does not depend on hover feedback.

## Specialized controls

Tabs, menu options, checkboxes, radio swatches, native selects, disclosures, portraits and panel handles keep their recognizable purpose and keyboard behavior. They share the system's ink, paper, keylines and focus vocabulary without adopting a filled primary silhouette.

| Control | Deliberate treatment |
| --- | --- |
| Workspace, quest-status and definition-kind tabs | A selected rule and heavier label; folder tabs retain their attachment to the list |
| Row action menus | Full-height option rows, highlighted surface, checked selection; preserve Radix keyboard operation |
| Command suggestions | Native option buttons with an active mark/weight and field fill; preserve listbox and active descendant behavior |
| Editable list text | Body type for readable content; quiet edit affordance, checkboxes for completion, grips for reorder |
| Panel handles | Attached edge silhouette and panel glyph; preserve expanded state and focus restoration |
| Quest starting-point tiles | Fine keyline, paper surface, subtle hover shadow; retain title and description |
| Construct portrait | Artwork stays the trigger, with a full target and accessible name |
| Appearance choices | Preserve the approved texture-only radios, solid selection and separate dashed focus |
| Fields and disclosures | Keep native field/summary behavior and their established surface or disclosure arrow |
| Navigation and saved-content links | Preserve destinations and recognizable links; do not turn ordinary prose links into buttons |
| Notices, statuses and saved-content cards | Static content has no action styling or false affordance |

The [control inventory](design/button-controls.csv) maps each interactive declaration found during the audit to its role. Repeated list rows share one declaration. It covers signed-out forms, signed-in pages, native controls, Radix wrappers and action links. Wrapper entries inherit the child role; they are not additional visible buttons. The audit began on `2a0cfc75`; paths identify the control even when later edits move its line.

## Ownership and verification

Issue #1045 owns shared action roles and theme tokens. Bucket controls (#1030), conversation layout (#1041) and panel composition (#1042) consume these roles instead of introducing their own button variants.

Contrast tests cover action text, action fills, borders and keyboard focus in all three appearances. Browser integrations exercise existing behavior and phone fit. Actual running application screenshots must also be compared with the approved Letterpress mockup, including desktop and 320 px, the three appearances, hover, focus, pressed, disabled, busy, menus and destructive confirmation. Tests and a standalone specimen do not establish application fidelity.
