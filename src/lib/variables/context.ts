export type { TemplateContext } from "./resolve";
export {
  buildBotTemplateContext,
  buildCaseTemplateContext,
  buildDiscordTemplateContext,
  resolveTemplate,
} from "./resolve";
export type { BotTemplateContext, DiscordVisitorContext } from "./resolve";
export {
  displayToStorage,
  storageToDisplay,
  extractStorageVariables,
  variableDisplayPath,
} from "./format";
export {
  TemplateText,
  renderTemplateString,
  renderTemplateTokens,
  shouldResolveVariables,
  splitTemplateTokens,
  type TemplateTextContext,
  type TemplateToken,
} from "./template-text";
