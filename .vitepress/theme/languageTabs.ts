/** Keeps every request example on the site in the language the reader last
 * picked. VitePress switches only the tab group that was clicked; this follows
 * it by switching every other group on the page to the same tab, and
 * remembers the choice for the next page and the next visit. */

const STORAGE_KEY = "sf-docs-language";

/** Shows the tab labelled `title` in every group that has one. */
function select(title: string) {
  for (const group of document.querySelectorAll(".vp-code-group")) {
    const labels = Array.from(group.querySelectorAll<HTMLLabelElement>(".tabs label"));
    const index = labels.findIndex((label) => label.dataset.title === title);
    if (index < 0) continue;
    const input = group.querySelectorAll<HTMLInputElement>(".tabs input")[index];
    if (input) input.checked = true;
    Array.from(group.querySelector(".blocks")?.children ?? []).forEach((block, i) =>
      block.classList.toggle("active", i === index),
    );
  }
}

/** Applies the remembered language, if there is one. Storage can be missing
 * or blocked (a private window), in which case the first tab stays. */
export function restoreLanguage() {
  try {
    const title = localStorage.getItem(STORAGE_KEY);
    if (title) select(title);
  } catch {
    // Nothing remembered; leave the default.
  }
}

/** Follows every tab click with the same choice everywhere else. */
export function followLanguageClicks() {
  window.addEventListener("click", (event) => {
    const input = (event.target as HTMLElement).closest?.(".vp-code-group input");
    if (!input) return;
    const label = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
    const title = label?.dataset.title;
    if (!label || !title) return;

    // Groups above this one change height when they switch, which would move
    // the clicked tab out from under the pointer. Hold it where it was.
    const before = label.getBoundingClientRect().top;
    select(title);
    window.scrollBy(0, label.getBoundingClientRect().top - before);

    try {
      localStorage.setItem(STORAGE_KEY, title);
    } catch {
      // The choice still holds on this page; it is just not remembered.
    }
  });
}
