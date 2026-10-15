import { createContext, useContext } from "react";
import { ja } from "./ja";
import type { Messages } from "./messages";

const MessagesContext = createContext<Messages>(ja);

/** Provides the display-language dictionary to descendants. */
export const MessagesProvider = MessagesContext.Provider;

/** The display-language dictionary. */
export const useMessages = (): Messages => useContext(MessagesContext);
