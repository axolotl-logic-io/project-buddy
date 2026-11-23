# Button system

Letterpress is the site's shared action language: flat resting surfaces with a fine keyline, a subtle warm shadow on pointer hover, and a shallow inset when pressed. Targets stay at least 44 px, and text can wrap at 320 px. The roles live in `apps/web/src/app/page-roles.css`, and the `Button` component in `apps/web/src/components/ui/button.tsx` applies them.

## Color vocabulary

| Material | Purpose | Shared role |
| --- | --- | --- |
| Brass | The main commitment in a form or page, such as Save, Send or Start | Button primary |
| Paper | Another action, such as Cancel, Copy or Stop | Button secondary |
| Ink | A quiet action, such as Edit, Add or Undo | Button quiet |
| Sealing wax | Confirmation of deletion or ending access | Button danger |
| Sealing wax text | A quiet trigger that opens a destructive confirmation | Button quiet-danger |
| Graphite | An unavailable action, with its disabled state | Native disabled |

These names describe design decisions, not product labels. The action palette has its own semantic tokens, so changing a button never recolors unrelated prose or notices. Danger uses the existing danger and on-danger tokens.

## Use shared controls

Use `Button` for actions and `Button asChild` for a navigation link that needs action emphasis. Keep the child's anchor and destination. A form button explicitly requests `type="submit"`. A class name adds layout, not another color, font, radius or shadow.

Use one primary action per form where possible. Stop, which ends a performance, is a secondary action, not a destructive action. Reversible retirement and abandonment do not need the filled danger treatment. A destructive confirmation includes an explicit label and removal icon, and its cancel button receives initial focus.

Set `aria-busy` when an action is running and keep the form's existing live status wording. An unavailable sibling action is disabled, not busy. A disabled control never gains a hover shadow.

Icon-only actions have accessible names. Quiet text actions have a resting underline; icon-only controls do not. The dashed keyboard outline stays independent from selection, hover and pressed feedback. Hover does not enlarge or move the target, and touch does not depend on hover feedback.

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
| Appearance choices | Texture-only radios, solid selection and separate dashed focus ([Appearance use cases](../apps/web/use-cases/appearance.md)) |
| Fields and disclosures | Keep native field/summary behavior and their established surface or disclosure arrow |
| Navigation and saved-content links | Preserve destinations and recognizable links; do not turn ordinary prose links into buttons |
| Notices, statuses and saved-content cards | Static content has no action styling or false affordance |

## Verification

Contrast tests cover action text, action fills, borders and keyboard focus in all three appearances. Tests alone do not establish fidelity, so compare the running application on desktop and at 320 px, in the three appearances, and in the hover, focus, pressed, disabled, busy, menu and destructive-confirmation states.
