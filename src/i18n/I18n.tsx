import { createContext, useContext } from "react";
import { ja } from "./ja";
import type { Messages } from "./messages";

const MessagesContext = createContext<Messages>(ja);

/** 子孫に表示言語の辞書を配る。 */
export const MessagesProvider = MessagesContext.Provider;

/** 表示言語の辞書。 */
export const useMessages = (): Messages => useContext(MessagesContext);
