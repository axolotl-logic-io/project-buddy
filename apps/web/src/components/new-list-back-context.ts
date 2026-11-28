import { createContext } from "react";

// The New list dialog's way back to its first step, for the step that
// shows a list kind's details. Zotero setup comes from the server, so it
// reads Back from here instead of from a prop.
const NewListBackContext = createContext<(() => void) | undefined>(undefined);

export { NewListBackContext };
