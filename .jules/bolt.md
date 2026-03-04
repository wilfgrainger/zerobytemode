
## 2025-03-02 - [Fix React Re-renders from Unnecessary object URL recreation]
**Learning:** Found an issue where `URL.createObjectURL(selectedFile.file)` in the main `Home` component would trigger on *any* update to the `files` state array (such as individual worker logs). This caused excessive creation and destruction of object URLs.
**Action:** When working with objects derived from state arrays, ensure the `useEffect` dependency is explicitly tied to the primitive reference or specific field (e.g., `[selectedFile?.file]`) rather than the overarching list dependency `[files]`.
